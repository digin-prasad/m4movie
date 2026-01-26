
const cleanTitle = (t) => {
    let cleaned = t.toLowerCase();

    // NEW STRATEGY: Truncate after TV Pattern
    // Matches: S01E01, S01, Season 1, 1x01
    const tvPattern = /(?:s\d+(?:\s*e\d+)?|season\s*\d+|\d+x\d+|episode\s*\d+)/;
    const match = cleaned.match(tvPattern);

    if (match && match.index > 0) {
        console.log(`[Truncate] Detected TV Pattern "${match[0]}" at index ${match.index}. Truncating...`);
        cleaned = cleaned.substring(0, match.index);
    }

    // Standard Cleaning (for what's left)
    cleaned = cleaned
        .replace(/\b(19|20)\d{2}\b/g, '')
        .replace(/[.\-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return cleaned;
};

const input1 = "Stranger Things S02E06 iNTERNAL 720p WEB-DL x264";
const input2 = "Game of Thrones Season 5 Complete";
const input3 = "The Witcher 2019 S01E01";
const input4 = "Lucifer.S05E08.iNTERNAL.1080p.WEB.H264-STRiFE";

[input1, input2, input3, input4].forEach(i => {
    console.log(`Original: "${i}"\nCleaned:  "${cleanTitle(i)}"\n`);
});
