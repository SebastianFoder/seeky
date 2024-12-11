import axios from "axios";

export async function getCaptchaToken() {
    return new Promise<string | null>(resolve => {
        grecaptcha.ready(async () => {
            const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
            if (!siteKey) {
                resolve(null);
                return;
            }

            const token = await grecaptcha.execute(siteKey, { action: "login" });
            resolve(token);
        });
    });
}

export async function verifyCaptchaToken(token: string) {

    const defaultUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    try {
        const res = await axios.post(`${defaultUrl}/api/verifyCaptchaToken`, { token });
        return res.data;
    } catch (error) {
        console.error('reCAPTCHA verification failed:', error);
        return { success: false };
    }
}
