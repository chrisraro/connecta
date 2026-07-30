"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ProfileInfo } from "@/types/profile";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { ProfileImage } from "@/components/templates/ProfileImage";
import { HERALD } from "@/lib/brand";

interface AccessCardProps {
    profileId: string;
    agent: ProfileInfo;
    className?: string;
}

export function AccessCard({ profileId, agent, className }: AccessCardProps) {
    const [profileUrl, setProfileUrl] = useState("");
    useEffect(() => {
        setProfileUrl(`${window.location.origin}/p/${profileId}`);
    }, [profileId]);

    return (
        <div className={cn(
            "relative w-full aspect-[2/3] max-w-[340px] mx-auto rounded-[2.5rem] overflow-hidden bg-zinc-950 flex flex-col p-8 text-white shadow-2xl border border-zinc-800/50",
            "bg-gradient-to-br from-zinc-900 via-zinc-950 to-black",
            className
        )}>
            {/* Background Grain/Grid effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
            </div>

            {/* Top Label */}
            <div className="text-[10px] tracking-[0.4em] font-medium text-zinc-500 mb-4 uppercase text-center w-full relative z-10">
                Access Card
            </div>

            {/* Middle: Large Prominent QR Code */}
            <div className="flex-1 flex items-center justify-center relative z-10">
                <div className="bg-white p-4 rounded-[2rem] shadow-2xl shadow-white/10 w-full aspect-square max-w-[240px] flex items-center justify-center">
                    <QRCodeSVG 
                        value={profileUrl}
                        size={200}
                        level="H"
                        includeMargin={false}
                        fgColor="#000000"
                        bgColor="#FFFFFF"
                        className="w-full h-full"
                    />
                </div>
            </div>

            {/* Bottom Section: Name, Company and Profile Pic */}
            <div className="mt-8 flex justify-between items-end relative z-10">
                <div className="flex-1 pr-4">
                    {agent.company && (
                        <p className="text-[10px] tracking-[0.2em] font-bold text-zinc-500 uppercase mb-1 truncate">
                            {agent.company}
                        </p>
                    )}
                    <h3 className="text-2xl font-black tracking-tight uppercase leading-none mb-1">
                        {agent.fullName}
                    </h3>
                    <p className="text-[11px] tracking-[0.1em] font-medium text-zinc-400 uppercase">
                        {agent.title || "Member"}
                    </p>
                </div>

                {/* Profile Pic moved to bottom right */}
                <div className="flex-shrink-0">
                    {agent.avatarUrl ? (
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 bg-zinc-900 shadow-xl">
                            <ProfileImage
                                src={agent.avatarUrl}
                                alt={agent.fullName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/10">
                            <User className="w-8 h-8 text-zinc-500" />
                        </div>
                    )}
                </div>
            </div>
            
            {/* Bottom Tagline */}
            <div className="mt-6 pt-4 border-t border-white/5 text-[8px] tracking-[0.5em] text-zinc-600 uppercase text-center">
                {HERALD.name} Digital Identity
            </div>
        </div>
    );
}
