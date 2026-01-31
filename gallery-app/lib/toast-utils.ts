/**
 * Windows Toast (Browser Notification) Utility
 */

export async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.error("This browser does not support desktop notification");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
}

export function showToastNotification(title: string, body: string, icon?: string) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: icon || "/logo.png", // 브라우저 알림에 표시될 아이콘
        });
    }
}
