import admin from "firebase-admin";

let _app: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (_app) return _app;

  const raw = process.env["FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON"];
  if (!raw) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON secret is required");
  }

  const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
  _app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return _app;
}

export async function verifyFirebaseToken(
  idToken: string,
): Promise<{ uid: string; displayName: string }> {
  const app = getApp();
  const decoded = await admin.auth(app).verifyIdToken(idToken);

  let displayName = decoded.email ?? "";
  if (!displayName && decoded.phone_number) {
    const phone = decoded.phone_number;
    displayName =
      phone.slice(0, 3) +
      "*".repeat(Math.max(0, phone.length - 7)) +
      phone.slice(-4);
  }
  if (!displayName) displayName = "User";

  return { uid: decoded.uid, displayName };
}
