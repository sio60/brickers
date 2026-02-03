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

export function showToastNotification(title: string, body: string, icon?: string, onClick?: string) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        const notification = new Notification(title, {
            body: body,
            icon: icon || "/logo.png",
        });

        // 클릭 시 해당 URL로 이동
        if (onClick) {
            notification.onclick = () => {
                window.focus();
                window.location.href = onClick;
                notification.close();
            };
        }

        // cleanup - 닫힐 때 핸들러 제거 (메모리 누수 방지)
        notification.onclose = () => {
            notification.onclick = null;
            notification.onclose = null;
        };
    }
}
