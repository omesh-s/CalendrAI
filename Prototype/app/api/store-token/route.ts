import { NextResponse, NextRequest } from "next/server";
import { serialize } from 'cookie';


export async function POST(req: NextRequest) {
            const body = await req.json();
            const { idToken } = body;
            // console.log("SERVER ORUTED REAFSA",idToken.length)

            if (idToken) {
                const cookie = serialize('idToken', idToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 60 * 60, // 1 hour
                    path: '/',
                });
                const res = NextResponse.json({ message: 'Token stored' });
                res.headers.set('Set-Cookie', cookie);
                return res;
            } else {
                return NextResponse.json({ message: 'No token provided' }, { status: 400 });
            }
}