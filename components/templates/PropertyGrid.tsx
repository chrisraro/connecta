import { TemplateProps } from "@/types/profile";
import { MapPin, Bed, Bath, Maximize2, Layers, Home } from "lucide-react";
import { useState } from "react";

export default function PropertyGrid({ data }: TemplateProps) {
    const { properties, theme } = data;

    if (!properties || properties.length === 0) return null;

    return (
        <div className="px-4 py-8">
            <h2
                className="text-center text-xl font-bold mb-8 uppercase tracking-widest"
                style={{ color: theme.textColor }}
            >
                Featured Listings
            </h2>

            {/* Single Column Feed */}
            <div className="flex flex-col gap-8 max-w-md mx-auto">
                {properties.map((prop) => (
                    <div
                        key={prop.id}
                        className="rounded-2xl overflow-hidden shadow-lg border border-white/10"
                        style={{ backgroundColor: theme.backgroundColor === '#000000' ? '#1a1a1a' : '#ffffff' }}
                    >
                        {/* Image Carousel */}
                        <div className="relative h-64 bg-gray-200 w-full group">
                            <div className="flex overflow-x-auto snap-x snap-mandatory h-full w-full scrollbar-hide">
                                {(prop.images && prop.images.length > 0 ? prop.images : ["/placeholder-property.jpg"]).map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`${prop.title} - ${idx + 1}`}
                                        className="w-full h-full object-cover flex-shrink-0 snap-center"
                                    />
                                ))}
                            </div>

                            {/* Status & Type Badges */}
                            <div className="absolute top-3 left-3 flex gap-2">
                                <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm uppercase font-bold tracking-wider">
                                    {prop.status}
                                </div>
                                {prop.type && (
                                    <div className="bg-white/90 text-black text-[10px] px-2 py-1 rounded backdrop-blur-sm uppercase font-bold tracking-wider flex items-center gap-1">
                                        <Home className="w-3 h-3" /> {prop.type.replace('-', ' ')}
                                    </div>
                                )}
                            </div>

                            {/* Image Counter Badge if multiple */}
                            {prop.images?.length > 1 && (
                                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md">
                                    Swipe for more
                                </div>
                            )}
                        </div>

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-xl leading-tight" style={{ color: theme.textColor }}>{prop.title}</h3>
                                <div className="text-right">
                                    <span className="font-bold text-lg" style={{ color: theme.primaryColor }}>
                                        ₱{prop.price.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 text-sm opacity-60 mb-4 font-medium" style={{ color: theme.textColor }}>
                                <MapPin className="w-3 h-3" />
                                {prop.location || "Location not specified"}
                            </div>

                            {/* Key Specs Grid */}
                            <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-xs font-medium opacity-80 mb-4" style={{ color: theme.textColor }}>
                                {prop.floorArea && (
                                    <div className="flex items-center gap-1.5">
                                        <Maximize2 className="w-3.5 h-3.5" /> {prop.floorArea}m² Floor
                                    </div>
                                )}
                                {prop.lotArea && (
                                    <div className="flex items-center gap-1.5">
                                        <Maximize2 className="w-3.5 h-3.5" /> {prop.lotArea}m² Lot
                                    </div>
                                )}
                                {prop.floors && (
                                    <div className="flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5" /> {prop.floors} Floors
                                    </div>
                                )}
                                {prop.bedrooms && (
                                    <div className="flex items-center gap-1.5">
                                        <Bed className="w-3.5 h-3.5" /> {prop.bedrooms} Beds
                                    </div>
                                )}
                                {prop.bathrooms && (
                                    <div className="flex items-center gap-1.5">
                                        <Bath className="w-3.5 h-3.5" /> {prop.bathrooms} CRs
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {prop.description && (
                                <div className="text-sm border-t pt-3 opacity-70 leading-relaxed max-h-24 overflow-y-auto" style={{ borderColor: theme.textColor + '20', color: theme.textColor }}>
                                    {prop.description}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
