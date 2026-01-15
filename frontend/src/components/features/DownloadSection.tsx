'use client';

import { Download, Film, HardDrive, Monitor, Smartphone, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DownloadSectionProps {
    movieId: number;
    movieTitle: string;
}

// Mock Data Removed - Using Real API Data
// const MOCK_FILES = [
//     { resolution: '480p', size: '450MB', type: 'WEB-DL', codec: 'x264', id: '1' },
//     { resolution: '720p', size: '950MB', type: 'WEB-DL', codec: 'x264', id: '2' },
//     { resolution: '720p', size: '740MB', type: 'WEB-DL', codec: 'x265 10bit', id: '3' },
//     { resolution: '720p', size: '800MB', type: 'WEBRip', codec: 'HEVC PSA', id: '4' },
//     { resolution: '1080p', size: '2.4GB', type: 'WEB-DL', codec: 'x264', id: '5' },
//     { resolution: '1080p', size: '1.8GB', type: 'WEB-DL', codec: 'x265 10bit', id: '6' },
// ];

export function DownloadSection({ movieId, movieTitle }: DownloadSectionProps) {
    const [activeTab, setActiveTab] = useState('720p');
    const [downloads, setDownloads] = useState<any[]>([]); // Use 'any' or proper type
    const [loading, setLoading] = useState(true);
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'M4_MOVIEBOT';

    useEffect(() => {
        const fetchDownloads = async () => {
            try {
                // Fetch specific results for this movie title (Server Side Search) WITH ungroup=true
                // This ensures we get ALL file versions (720p, 1080p) not just one banner
                const res = await fetch(`/api/movies?q=${encodeURIComponent(movieTitle)}&ungroup=true`);
                const data = await res.json();

                // Handle API response (Array)
                const results = Array.isArray(data) ? data : (data.movies || []);

                // Filter to ensure we only show LOCAL files that match this movie
                // And ensure we have local_data (meaning it's a file, not just a global search result)
                const matches = results.filter((m: any) => {
                    if (!m.local_data) return false; // Must be a local file

                    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return normalize(m.title).includes(normalize(movieTitle)) || normalize(movieTitle).includes(normalize(m.title));
                });

                setDownloads(matches);

                // Auto-select tab if available
                if (matches.length > 0) {
                    const resolutions = matches.map((m: any) => m.quality);
                    if (resolutions.includes('720p')) setActiveTab('720p');
                    else if (resolutions.includes('1080p')) setActiveTab('1080p');
                    else setActiveTab(resolutions[0]);
                }

            } catch (e) {
                console.error("Failed to fetch downloads", e);
            } finally {
                setLoading(false);
            }
        };

        fetchDownloads();
    }, [movieTitle]);

    // Filter files based on active tab
    const filteredFiles = downloads.filter(f => (f.quality?.toLowerCase() || 'unknown') === activeTab.toLowerCase());

    // Extract available qualities dynamically (filter out empty/null)
    const availableQualities = Array.from(new Set(downloads.map(d => d.quality?.toLowerCase() || 'unknown'))).sort();

    // Auto-select tab logic
    useEffect(() => {
        if (availableQualities.length > 0 && !availableQualities.includes(activeTab)) {
            if (availableQualities.includes('720p')) setActiveTab('720p');
            else if (availableQualities.includes('1080p')) setActiveTab('1080p');
            else setActiveTab(availableQualities[0]);
        }
    }, [availableQualities, activeTab]);

    // Count per quality
    const counts = availableQualities.reduce((acc, q) => {
        acc[q] = downloads.filter(d => d.quality === q).length;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
                <Download className="w-6 h-6 text-primary" />
                Available Downloads
            </h3>

            {/* Dynamic Resolution Tabs */}
            {availableQualities.length > 0 && (
                <div className="flex p-1 bg-secondary/30 rounded-lg border border-white/5 backdrop-blur-sm overflow-x-auto">
                    {availableQualities.map((res: any) => (
                        <button
                            key={res}
                            onClick={() => setActiveTab(res)}
                            className={cn(
                                "flex-1 min-w-[80px] py-3 text-sm font-medium rounded-md transition-all duration-100 flex items-center justify-center gap-2 active:scale-95",
                                activeTab === res
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {/* Icons based on likely resolution */}
                            {(res === '480p' || res === '360p') && <Smartphone className="w-4 h-4" />}
                            {res === '720p' && <Monitor className="w-4 h-4" />}
                            {(res === '1080p' || res === '4k' || res === '2160p') && <Film className="w-4 h-4" />}

                            {res.toUpperCase()}
                            <span className={cn(
                                "ml-1 text-[10px] px-1.5 py-0.5 rounded-full",
                                activeTab === res ? "bg-white/20 text-white" : "bg-white/10"
                            )}>
                                {counts[res]}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Search Files Input */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search files (e.g. x265, HEVC)"
                    className="w-full bg-background/50 border border-white/10 rounded-lg py-3 px-4 pl-10 text-sm focus:outline-none focus:border-primary/50 transition-colors duration-100"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* File List */}
            {/* File List or Empty State */}
            <div className="space-y-3">
                {downloads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-card/50 border border-white/5 text-center space-y-4">
                        <div className="p-3 bg-white/5 rounded-full">
                            <AlertCircle className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h4 className="text-lg font-medium text-white">No files available yet</h4>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                We haven't uploaded this movie yet. You can request it, and our admins will add it shortly.
                            </p>
                        </div>
                        <Link
                            href={`https://t.me/${botUsername}?start=request_${encodeURIComponent(movieTitle)}`}
                            target="_blank"
                            className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 transition-all duration-75 flex items-center gap-2 active:scale-95 shadow-lg shadow-primary/20"
                        >
                            <Download className="w-4 h-4" />
                            Request This Movie
                        </Link>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground bg-white/5 rounded-xl border border-white/5">
                        <p>No files found for {activeTab.toUpperCase()}.</p>
                        <button onClick={() => setActiveTab(availableQualities[0])} className="text-primary text-sm hover:underline mt-2">
                            Show all available files
                        </button>
                    </div>
                ) : (
                    filteredFiles.map((file, i) => (
                        <div
                            key={file.file_id || file._id || file.slug || `file-${i}`}
                            className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl bg-card/50 border border-white/5 hover:border-primary/50 hover:bg-card transition-all duration-150 gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-white truncate text-sm md:text-base">
                                        {file.original_title ? file.original_title.replace(/[._]/g, ' ') : file.title} {file.year !== 'unknown' ? file.year : ''} <span className="text-primary">{file.quality?.toUpperCase()}</span>
                                    </h4>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {/* Size */}
                                    <span className="flex items-center gap-1 font-mono text-white/70">
                                        <HardDrive className="w-3 h-3" />
                                        {file.size || 'Unknown Size'}
                                    </span>

                                    {/* Codec / Extra Info */}
                                    {file.codec && (
                                        <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] uppercase">
                                            {file.codec}
                                        </span>
                                    )}

                                    {/* Good Encode Badge */}
                                    {/(PSA|HEVC|x265|10bit|Pahe)/i.test(file.codec || '') && (
                                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-semibold text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                                            Good Encode
                                        </span>
                                    )}

                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium text-[10px] uppercase tracking-wider">
                                        Telegram File
                                    </span>
                                </div>
                            </div>

                            <Link
                                href={`https://t.me/${botUsername}?start=${file.slug}`}
                                target="_blank"
                                className="w-full md:w-auto px-6 py-2.5 bg-white text-black font-semibold text-sm rounded-lg hover:bg-gray-200 transition-colors duration-75 flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-95"
                            >
                                <Download className="w-4 h-4" />
                                Download
                            </Link>
                        </div>
                    ))
                )}
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 flex gap-3 text-blue-200 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>
                    Files are securely delivered via Telegram. Ensure you have the app installed.
                </p>
            </div>
        </div>
    );
}
