"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SmartphoneNfc, QrCode } from "lucide-react";

export default function CardsPage() {
    // Placeholder: Need to implement 'cards' table query
    const cards: any[] = [];

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">NFC Inventory</h1>
                    <p className="text-zinc-400">Manage your physical TapFolio cards.</p>
                </div>
                <Button className="font-bold bg-white text-black hover:bg-gray-200">
                    <QrCode className="w-4 h-4 mr-2" />
                    Activate New Card
                </Button>
            </div>

            <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
                <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-zinc-900 mb-4">
                    <SmartphoneNfc className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-bold mb-2">No Cards Active</h3>
                <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
                    You haven't activated any physical NFC cards yet. Scan the QR code on your card pack to get started.
                </p>
            </div>
        </div>
    );
}
