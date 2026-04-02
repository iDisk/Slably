import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set — email not sent");
  return new Resend(key);
}

export async function sendDocumentSigningRequest({
  to,
  clientName,
  contractorName,
  contractorCompany,
  projectName,
  documentTitle,
  documentId,
  projectId,
}: {
  to: string;
  clientName: string;
  contractorName: string;
  contractorCompany: string;
  projectName: string;
  documentTitle: string;
  documentId: number;
  projectId: number;
}) {
  const appUrl = process.env.APP_URL ?? "http://localhost:5173";
  const signingUrl = `${appUrl}/client?tab=contracts`;

  return getResend().emails.send({
    from: "BuildOS <onboarding@resend.dev>",
    to,
    subject: `${contractorCompany} te envió un documento para firmar: ${documentTitle}`,
    html: buildEmailHtml({
      clientName,
      contractorName,
      contractorCompany,
      projectName,
      documentTitle,
      signingUrl,
    }),
  });
}

export async function sendRfqNotification({
  to,
  subName,
  rfqTitle,
  rfqCity,
  rfqSpecialty,
  builderCompany,
}: {
  to: string;
  subName: string;
  rfqTitle: string;
  rfqCity: string;
  rfqSpecialty: string;
  builderCompany: string;
}) {
  const appUrl = process.env.APP_URL ?? "http://localhost:5173";
  const { data, error } = await getResend().emails.send({
    from: "BuildOS <onboarding@resend.dev>",
    to,
    subject: `Nueva solicitud de trabajo: ${rfqTitle}`,
    html: buildRfqEmailHtml({
      subName,
      rfqTitle,
      rfqCity,
      rfqSpecialty,
      builderCompany,
      networkUrl: `${appUrl}/network`,
    }),
  });
  if (error) console.error(`[RFQ EMAIL] ❌ Failed → ${to}`, (error as any).message);
  else       console.log(`[RFQ EMAIL] ✅ Sent OK → ${to}`);
}

function buildRfqEmailHtml(p: {
  subName: string;
  rfqTitle: string;
  rfqCity: string;
  rfqSpecialty: string;
  builderCompany: string;
  networkUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;
              border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#1B3A5C;padding:32px 40px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">
        BUILD<span style="color:#F97316;">OS</span>
      </h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Red de subcontratistas</p>
    </div>

    <div style="padding:40px;">
      <p style="margin:0 0 16px;font-size:16px;color:#111827;">
        Hola <strong>${p.subName}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
        <strong>${p.builderCompany}</strong> publicó una nueva solicitud de trabajo
        que coincide con tu especialidad.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;
                  border-radius:8px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;
                  text-transform:uppercase;letter-spacing:0.05em;">Trabajo</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">
          ${p.rfqTitle}
        </p>
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;
                  text-transform:uppercase;letter-spacing:0.05em;">Especialidad</p>
        <p style="margin:0 0 12px;font-size:14px;color:#374151;">${p.rfqSpecialty}</p>
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;
                  text-transform:uppercase;letter-spacing:0.05em;">Ciudad</p>
        <p style="margin:0;font-size:14px;color:#374151;">${p.rfqCity}</p>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${p.networkUrl}"
           style="display:inline-block;background:#F97316;color:#ffffff;
                  text-decoration:none;padding:14px 32px;border-radius:8px;
                  font-size:15px;font-weight:600;letter-spacing:0.02em;">
          Ver solicitud y cotizar →
        </a>
      </div>
    </div>

    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Este email fue enviado por BuildOS en nombre de ${p.builderCompany}.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildEmailHtml(params: {
  clientName: string;
  contractorName: string;
  contractorCompany: string;
  projectName: string;
  documentTitle: string;
  signingUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;
              border-radius:12px;overflow:hidden;
              border:1px solid #e5e7eb;">

    <div style="background:#1B3A5C;padding:32px 40px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;
                 letter-spacing:1px;">BUILD<span style="color:#F97316;">OS</span></h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">
        Plataforma de gestión de construcción
      </p>
    </div>

    <div style="padding:40px;">
      <p style="margin:0 0 16px;font-size:16px;color:#111827;">
        Hola <strong>${params.clientName}</strong>,
      </p>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
        <strong>${params.contractorCompany}</strong> te ha enviado un documento 
        para revisar y firmar en el proyecto 
        <strong>${params.projectName}</strong>.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;
                  border-radius:8px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;
                  text-transform:uppercase;letter-spacing:0.05em;">
          Documento
        </p>
        <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">
          ${params.documentTitle}
        </p>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${params.signingUrl}"
           style="display:inline-block;background:#F97316;color:#ffffff;
                  text-decoration:none;padding:14px 32px;border-radius:8px;
                  font-size:15px;font-weight:600;letter-spacing:0.02em;">
          Ver y firmar documento →
        </a>
      </div>

      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
        Si tienes preguntas, puedes contactar directamente a 
        ${params.contractorName} de ${params.contractorCompany}.
      </p>
    </div>

    <div style="background:#f9fafb;padding:20px 40px;
                border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Este email fue enviado por BuildOS en nombre de 
        ${params.contractorCompany}.
      </p>
    </div>

  </div>
</body>
</html>`;
}
