export default function Loading() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-xl font-bold text-white tracking-widest animate-pulse">M4MOVIE LOADING...</h2>
            <p className="text-gray-400 text-sm">Please wait while we fetch the latest movies Part...</p>
        </div>
    );
}
