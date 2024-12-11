import { CaptchaData } from "@/types/captchaData";
import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const { token } = await req.json();
    console.log("token", token);
    console.log("secretKey", secretKey);

    if (!token) {
        console.log("token is required");
        return NextResponse.json({ success: false }, { status: 400 });
    }

    if (!secretKey) {
        console.log("secretKey is required");
        return NextResponse.json({ success: false }, { status: 400 });
    }

    try {
        const url = new URL('https://www.google.com/recaptcha/api/siteverify');
        url.searchParams.set('secret', secretKey);
        url.searchParams.set('response', token);

        const res = await axios.post<CaptchaData>(url.toString(),{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });


        if (res.data.success && res.data.score > 0.5) {
            return NextResponse.json({ success: true, score: res.data.score }, { status: 200 });
        } else {
            return NextResponse.json({ success: false }, { status: 400 });
        }

    } catch (error) {
        console.error('reCAPTCHA verification failed:', error);
        return NextResponse.json({ success: false }, { status: 400 });
    }
}