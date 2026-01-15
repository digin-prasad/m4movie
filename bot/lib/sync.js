const db = require('./db');
const { processMessage } = require('../handlers/indexer');

/**
 * Finds the latest message ID in a channel by probing forward.
 * Uses a safe pacing to avoid 429 errors.
 */
const findLatestID = async (bot, channelId) => {
    let low = Math.max(1, db.getSyncProgress(channelId));
    let high = low + 10000;
    let latest = low;

    console.log(`[SYNC] [${channelId}] Finding latest ID starting from ${low}...`);

    // 1. Find an upper bound
    while (true) {
        try {
            await new Promise(r => setTimeout(r, 300));
            const destId = channelId;
            const msg = await bot.telegram.copyMessage(destId, channelId, high, { disable_notification: true });
            if (msg) {
                await bot.telegram.deleteMessage(destId, msg.message_id).catch(() => { });
                latest = high;
                low = high;
                high += 10000;
            } else {
                break;
            }
        } catch (e) {
            break;
        }
    }

    // 2. Binary search within [low, high]
    let start = low;
    let end = high;
    while (start <= end) {
        let mid = Math.floor((start + end) / 2);
        await new Promise(r => setTimeout(r, 300));
        try {
            const destId = channelId;
            const msg = await bot.telegram.copyMessage(destId, channelId, mid, { disable_notification: true });
            if (msg) {
                await bot.telegram.deleteMessage(destId, msg.message_id).catch(() => { });
                latest = mid;
                start = mid + 1;
            } else {
                end = mid - 1;
            }
        } catch (e) {
            end = mid - 1;
        }
    }
    return latest;
};

/**
 * Main Sync Function: Real-Time Watcher Edition
 */
const syncChannel = async (bot) => {
    const rawChannels = process.env.STORAGE_CHANNEL_ID;
    if (!rawChannels) return;

    const channels = rawChannels.split(',').map(s => s.trim()).filter(Boolean);
    if (!bot.botInfo) bot.botInfo = await bot.telegram.getMe();

    // SIMPLE LOCK: Prevent overlapping syncs
    if (global.isSyncing) {
        console.log('[SYNC] Sync already in progress. Skipping cycle.');
        return;
    }
    global.isSyncing = true;

    try {
        for (const channelId of channels) {
            let lastId = db.getSyncProgress(channelId);

            // FORCE HISTORY START: If flag is enabled, ignore saved progress and start from 0
            if (process.env.ENABLE_HISTORY_SYNC === 'true') {
                // Check if we are already far ahead (just to log it)
                if (lastId > 0) {
                    console.log(`[SYNC] [${channelId}] History Sync Active: Ignoring saved progress (${lastId}) to scan old files.`);
                }
                lastId = 0;
            }

            // INITIALIZE: If 0, check if we should jump or start from scratch
            if (lastId === 0) {
                if (process.env.ENABLE_HISTORY_SYNC === 'true') {
                    console.log(`[SYNC] [${channelId}] HISTORY SYNC ENABLED: Starting scan from ID 1...`);
                    lastId = 0; // Explicitly ensure we start from the beginning logic below
                } else {
                    console.log(`[SYNC] [${channelId}] Initializing... Jumping to latest ID.`);
                    const latest = await findLatestID(bot, channelId);
                    db.updateSyncProgress(channelId, latest);
                    console.log(`[SYNC] [${channelId}] Initialized at ID: ${latest}`);
                    continue;
                }
            }

            // SCAN NEW: Check for anything newer than lastId
            let currentId = lastId;
            let foundNew = false;
            let checkedCount = 0;

            // If history sync is on, we want to keep going much longer
            const SCAN_LIMIT = process.env.ENABLE_HISTORY_SYNC === 'true' ? 100000 : 100;

            // Scan a small window ahead (polite check)
            while (checkedCount < SCAN_LIMIT) {
                currentId++;
                checkedCount++;
                await new Promise(r => setTimeout(r, 1500)); // Safer Pacing (Increased to avoid 429)

                // Progress Logging (every 20 messages)
                if (currentId % 20 === 0) {
                    console.log(`[SYNC] [${channelId}] Scanning ID ${currentId}...`);
                }

                try {
                    // Redirect phantom copies to the Log Channel so users don't see them
                    const destId = process.env.LOG_CHANNEL_ID || channelId;
                    const msg = await bot.telegram.copyMessage(destId, channelId, currentId, { disable_notification: true });
                    if (msg) {
                        await bot.telegram.deleteMessage(destId, msg.message_id).catch(() => { });

                        const media = msg.video || msg.document;
                        if (media) {
                            const result = await processMessage(msg);
                            if (result && result.isNew) {
                                foundNew = true;
                                const filename = media.file_name || (msg.caption ? msg.caption.split('\n')[0] : 'Unknown File');

                                if (process.env.LOG_CHANNEL_ID) {
                                    // 🐢 SAFE 3-SECOND DELAY as requested
                                    await new Promise(r => setTimeout(r, 3000));
                                    const logMsg = `📁 <b>Registered File:</b>\n<code>${filename.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`;
                                    await bot.telegram.sendMessage(process.env.LOG_CHANNEL_ID, logMsg, { parse_mode: 'HTML' }).catch(() => { });
                                }
                            }
                        }
                        db.updateSyncProgress(channelId, currentId);
                    } else {
                        // If we are in history sync mode, we must TOLERATE GAPS (deleted messages)
                        if (process.env.ENABLE_HISTORY_SYNC === 'true') {
                            // console.log(`[SYNC] Msg was null/false at ID ${currentId}, continuing...`);
                            continue;
                        }
                        break;
                    }
                } catch (e) {
                    if (e.message.includes('429') || e.code === 429) {
                        console.warn(`[SYNC] [${channelId}] Rate Limited (429). Sleeping 60s...`);
                        await new Promise(r => setTimeout(r, 60000));
                        // Retry the same ID
                        currentId--;
                        checkedCount--;
                        continue;
                    }

                    if (process.env.ENABLE_HISTORY_SYNC === 'true') {
                        // console.log(`[SYNC] Catch error at ID ${currentId}, continuing...`);
                        continue;
                    }

                    console.log(`[SYNC] Breaking loop due to error at ID ${currentId} (History Sync Disabled)`);
                    break; // Stop on gaps (Original behavior - safest for now)
                }
            }

            if (!foundNew) {
                console.log(`[SYNC] [${channelId}] Idle – waiting for new files...`);
            }
        }
    } finally {
        global.isSyncing = false;
    }
};

module.exports = { syncChannel };
