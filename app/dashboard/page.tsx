export default function DashboardPage() {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-zinc-400 mb-8">Manage your NFC cards and digital profiles.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h3 className="text-zinc-500 text-sm font-medium mb-2">Total Taps</h3>
                    <div className="text-3xl font-bold">0</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h3 className="text-zinc-500 text-sm font-medium mb-2">Active Profiles</h3>
                    <div className="text-3xl font-bold">0</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h3 className="text-zinc-500 text-sm font-medium mb-2">AI Credits</h3>
                    <div className="text-3xl font-bold text-yellow-500">5</div>
                </div>
            </div>

            <div className="mt-12 p-12 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center">
                <h2 className="text-xl font-semibold mb-2">No Profiles Created Yet</h2>
                <p className="text-zinc-500 max-w-md mb-6">Create your first digital business card using our AI designer.</p>
                <button className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-gray-200">
                    Create New Profile
                </button>
            </div>
        </div>
    );
}
