"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { Doc } from "@/convex/_generated/dataModel";

export function NotificationsPopover() {
    const { user } = useUser();
    const router = useRouter();

    const notifications = useQuery(api.notifications.get, user?.id ? { clerkId: user.id } : "skip");
    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    if (notifications === undefined) {
        return (
            <Button variant="ghost" size="icon" className="relative cursor-wait">
                <Bell className="w-5 h-5 text-muted-foreground" />
            </Button>
        );
    }

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleNotificationClick = (notification: Doc<"notifications">) => {
        if (!notification.read) {
            markAsRead({ notificationId: notification._id });
        }
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (user?.id) {
            markAllAsRead({ clerkId: user.id });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
                <div className="flex items-center justify-between px-2 py-2">
                    <DropdownMenuLabel className="p-0 font-bold">Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary transition-colors"
                            onClick={handleMarkAllRead}
                        >
                            <Check className="w-3 h-3 mr-1" /> Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            No active notifications.
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification._id}
                                className={`flex flex-col items-start p-3 cursor-pointer gap-1 transition-colors ${
                                    !notification.read ? "bg-muted/50" : ""
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex items-start justify-between w-full">
                                    <span className="font-semibold text-sm leading-none">
                                        {notification.title}
                                    </span>
                                    {!notification.read && (
                                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-0.5" />
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground line-clamp-2">
                                    {notification.message}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70 mt-1 uppercase font-bold tracking-wider">
                                    {new Date(notification.createdAt).toLocaleDateString()}
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
