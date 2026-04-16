"use client";

import { ProfileData } from "@/types/profile";
import { Package, Briefcase, ChevronRight, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ServicesGrid({ data }: { data: ProfileData }) {
    if (!data.services || data.services.length === 0) return null;

    return (
        <section className="py-12 px-6" style={{ color: data.theme.textColor }}>
            <div className="flex items-center gap-2 mb-8">
                <Briefcase className="w-5 h-5" style={{ color: data.theme.primaryColor }} />
                <h2 className="text-2xl font-bold tracking-tight">Our Services</h2>
            </div>
            <div className="grid gap-4">
                {data.services.map((service, i) => (
                    <div 
                        key={i} 
                        className="p-6 rounded-2xl border flex flex-col gap-2 transition-all hover:shadow-md"
                        style={{ borderColor: `${data.theme.primaryColor}20`, backgroundColor: `${data.theme.textColor}05` }}
                    >
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg">{service.title}</h3>
                            {service.price && (
                                <span className="text-sm font-black px-3 py-1 rounded-full bg-primary/10" style={{ color: data.theme.primaryColor }}>
                                    ${service.price}
                                </span>
                            )}
                        </div>
                        <p className="text-sm opacity-70 leading-relaxed">{service.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function ProductsGrid({ data }: { data: ProfileData }) {
    if (!data.products || data.products.length === 0) return null;

    return (
        <section className="py-12 px-6" style={{ color: data.theme.textColor }}>
            <div className="flex items-center gap-2 mb-8">
                <Package className="w-5 h-5" style={{ color: data.theme.primaryColor }} />
                <h2 className="text-2xl font-bold tracking-tight">Featured Products</h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
                {data.products.map((product, i) => (
                    <div 
                        key={i} 
                        className="rounded-3xl border overflow-hidden flex flex-col transition-all hover:shadow-lg"
                        style={{ borderColor: `${data.theme.primaryColor}20`, backgroundColor: `${data.theme.textColor}05` }}
                    >
                        {product.image && (
                            <div className="aspect-square w-full relative bg-muted">
                                <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-black text-xl">{product.title}</h3>
                                {product.price && (
                                    <span className="text-lg font-bold" style={{ color: data.theme.primaryColor }}>
                                        ${product.price}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm opacity-70 line-clamp-3">{product.description}</p>
                            <Button 
                                className="w-full h-12 rounded-xl font-bold gap-2" 
                                style={{ backgroundColor: data.theme.primaryColor }}
                                onClick={() => product.link && window.open(product.link, '_blank')}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                {product.link ? "Buy Now" : "View Details"}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
