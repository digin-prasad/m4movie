
const tmdb = {
    searchMulti: async (query: string) => {
        console.log(`[MockTMDB] Searching for: "${query}"`);
        if (query.includes('stranger things internal')) {
            return []; // Fail match
        }
        if (query === 'stranger things') {
            return [{ id: 66732, name: 'Stranger Things', media_type: 'tv', first_air_date: '2016-07-15' }];
        }
        return [];
    }
};

const cleanTitle = (t: string) => {
    return t.toLowerCase()
        .replace(/\b(19|20)\d{2}\b/g, '')
        .replace(/s\d+\s*e\d+/g, '')
        .replace(/s\d+/g, '')
        .replace(/\d+x\d+/g, '')
        .replace(/season\s*\d+/g, '')
        .replace(/episode\s*\d+/g, '')
        .replace(/\b(4k|2160p|1080p|720p|480p|bluray|web-dl|webrip|x264|x265|hevc|aac|ac3|dts)\b/g, '')
        .replace(/\.(mkv|mp4|avi|mov|flv|wmv)\b/g, '')
        .replace(/[.\-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const filename = "Stranger Things S02E06 iNTERNAL 720p WEB-DL x264";
const cleaned = cleanTitle(filename);
console.log(`Original: ${filename}`);
console.log(`Cleaned:  "${cleaned}"`);

// Simulate Hydration Logic
const searchTitle = cleaned;
const run = async () => {
    const results = await tmdb.searchMulti(searchTitle);
    console.log("TMDB Results:", results.length > 0 ? "FOUND" : "NOT FOUND");
}
run();
