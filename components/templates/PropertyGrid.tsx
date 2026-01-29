import { TemplateProps } from "@/types/profile";
import { MapPin, Bed, Bath } from "lucide-react";

export default function PropertyGrid({ data }: TemplateProps) {
    const { properties, theme } = data;

    if (properties.length === 0) return null;

    return (
        <div className="px-4 py-8">
            <h2
                className="text-center text-xl font-bold mb-8 uppercase tracking-widest"
                style={{ color: theme.textColor }}
            >
                Featured Listings
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:px-8">
                {properties.map((prop) => (
                    <div
                        key={prop.id}
                        className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        style={{ backgroundColor: theme.backgroundColor === '#000000' ? '#1a1a1a' : '#ffffff' }} // Contrast bg
                    >
                        <div className="relative h-48 bg-gray-200">
                            <img
                                src={prop.imageUrl}
                                alt={prop.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm uppercase font-bold">
                                {prop.status}
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg leading-tight" style={{ color: theme.textColor }}>{prop.title}</h3>
                                <span className="font-bold" style={{ color: theme.primaryColor }}>
                                    ${prop.price.toLocaleString()}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 text-sm opacity-60 mb-4" style={{ color: theme.textColor }}>
                                <MapPin className="w-3 h-3" />
                                {prop.location || "Prime Location"}
                            </div>

                            <div className="flex gap-4 text-xs font-medium border-t pt-4 opacity-70" style={{ borderColor: theme.textColor + '20', color: theme.textColor }}>
                                <div className="flex items-center gap-1">
                                    <Bed className="w-4 h-4" /> {prop.beds || 3} Beds
                                </div>
                                <div className="flex items-center gap-1">
                                    <Bath className="w-4 h-4" /> {prop.baths || 2} Baths
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
