"use client";

import { Button } from "@/components/ui/button";
import { SmartphoneNfc, QrCode } from "lucide-react";

export default function CardsPage() {
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">NFC Inventory</h1>
                    <p className="text-muted-foreground">Manage your physical TapFolio cards.</p>
                </div>
                <Button className="font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                    <QrCode className="w-4 h-4 mr-2" />
                    Activate New Card
                </Button>
            </div>

            <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card">
                <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-muted mb-4">
                    <SmartphoneNfc className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-2">No Cards Active</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto font-medium">
                    You haven&apos;t activated any physical NFC cards yet. Scan the QR code on your card pack to get started.
                </p>
            </div>
        </div>
    );
}
