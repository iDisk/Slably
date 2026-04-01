import { db } from "@workspace/db";
import { contractTemplatesTable } from "@workspace/db/schema";

const templates = [
  // ─────────────────────────────────────────────────────────────
  // 1. CONSTRUCTION CONTRACT — EN
  // ─────────────────────────────────────────────────────────────
  {
    type: "construction",
    language: "en",
    title: "Construction Contract",
    isActive: true,
    content: `<div style="font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px 32px;color:#1a1a1a;line-height:1.7;">
<h1 style="text-align:center;font-size:22px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Construction Contract</h1>
<p style="text-align:center;margin-top:0;font-size:13px;color:#555;">Effective Date: {{effective_date}}</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">1. Parties</h2>
<p>This Construction Contract ("Agreement") is entered into as of {{effective_date}}, by and between:</p>
<p><strong>Owner:</strong> {{owner_name}}, located at {{owner_address}} ("Owner").</p>
<p><strong>Contractor:</strong> {{contractor_name}}, doing business as {{contractor_company}}, located at {{contractor_address}}, License No. {{contractor_license}}, State of {{contractor_state}}, Phone: {{contractor_phone}} ("Contractor").</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">2. Project Address</h2>
<p>The work described in this Agreement shall be performed at: {{project_address}}.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">3. Description of Services &amp; Scope of Work</h2>
<p>Contractor agrees to furnish all labor, materials, equipment, and services necessary to complete the following construction work ("Work"):</p>
<p>{{project_description}}</p>
<p>Any work not expressly included in this scope is excluded and may be addressed through a written Change Order.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">4. Contract Amount &amp; Payment</h2>
<p>Owner agrees to pay Contractor the total sum of <strong>{{contract_amount}}</strong> for the complete performance of the Work, payable per the draw schedule agreed upon by both parties.</p>
<p>Invoices not paid within 10 days of the due date shall accrue interest at {{interest_rate}}% per annum until paid in full.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">5. Term</h2>
<p>Contractor shall commence the Work on or before {{start_date}} and shall achieve substantial completion on or before {{end_date}}, subject to delays caused by Owner, Change Orders, or events of Force Majeure.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">6. Permits &amp; Approvals</h2>
<p>Contractor shall obtain and pay for all building permits and governmental approvals required for the Work. Owner shall cooperate and execute any documents reasonably required to obtain such permits.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">7. Insurance</h2>
<p>Contractor shall maintain, at its own expense, general liability insurance and workers' compensation insurance in amounts customary for the scope of work, and shall provide certificates of insurance to Owner upon request.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">8. Indemnification</h2>
<p>Contractor shall indemnify, defend, and hold harmless Owner from and against any claims, damages, losses, and expenses arising out of or resulting from Contractor's performance of the Work, to the extent caused by the negligent acts or omissions of Contractor or its subcontractors.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">9. Warranty</h2>
<p>Contractor warrants that all Work shall be completed in a workmanlike manner and in conformance with this Agreement. Contractor shall correct, at no additional cost to Owner, any defective Work discovered within one (1) year after substantial completion.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">10. Default &amp; Remedies</h2>
<p>If either party materially defaults in its obligations, the non-defaulting party shall provide written notice specifying the default. The defaulting party shall have {{cure_days}} calendar days to cure the default. If uncured, the non-defaulting party may terminate this Agreement and pursue available legal remedies.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">11. Force Majeure</h2>
<p>Neither party shall be liable for delays caused by acts of God, natural disasters, government orders, labor strikes, pandemics, or other events beyond the reasonable control of the affected party, provided notice is given promptly.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">12. Alternative Dispute Resolution</h2>
<p>Any dispute arising under this Agreement shall first be submitted to non-binding mediation. If mediation fails, the parties agree to resolve disputes through binding arbitration under the rules of the American Arbitration Association before pursuing litigation.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">13. Governing Law</h2>
<p>This Agreement shall be governed by and construed in accordance with the laws of the State of {{contractor_state}}, without regard to its conflict of law provisions.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">14. Entire Agreement</h2>
<p>This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. Amendments must be in writing and signed by both parties.</p>

<div style="margin-top:56px;display:flex;gap:48px;">
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Contractor Signature</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{contractor_name}} — {{contractor_company}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Date: _______________</p>
  </div>
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Owner Signature</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{owner_name}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Date: _______________</p>
  </div>
</div>
</div>`,
  },

  // ─────────────────────────────────────────────────────────────
  // 2. CONTRATO DE CONSTRUCCIÓN — ES
  // ─────────────────────────────────────────────────────────────
  {
    type: "construction",
    language: "es",
    title: "Contrato de Construcción",
    isActive: true,
    content: `<div style="font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px 32px;color:#1a1a1a;line-height:1.7;">
<h1 style="text-align:center;font-size:22px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Contrato de Construcción</h1>
<p style="text-align:center;margin-top:0;font-size:13px;color:#555;">Fecha de vigencia: {{effective_date}}</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">1. Partes</h2>
<p>Este Contrato de Construcción ("Contrato") se celebra el día {{effective_date}}, entre:</p>
<p><strong>Propietario:</strong> {{owner_name}}, con domicilio en {{owner_address}} ("Propietario").</p>
<p><strong>Contratista:</strong> {{contractor_name}}, con nombre comercial {{contractor_company}}, domicilio en {{contractor_address}}, Licencia No. {{contractor_license}}, Estado de {{contractor_state}}, Teléfono: {{contractor_phone}} ("Contratista").</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">2. Dirección del Proyecto</h2>
<p>Los trabajos descritos en este Contrato se ejecutarán en: {{project_address}}.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">3. Descripción de Servicios y Alcance de Obra</h2>
<p>El Contratista se compromete a suministrar toda la mano de obra, materiales, equipos y servicios necesarios para completar los siguientes trabajos de construcción ("Obra"):</p>
<p>{{project_description}}</p>
<p>Cualquier trabajo no incluido expresamente en este alcance queda excluido y podrá atenderse mediante una Orden de Cambio escrita.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">4. Monto del Contrato y Forma de Pago</h2>
<p>El Propietario acuerda pagar al Contratista la suma total de <strong>{{contract_amount}}</strong> por la ejecución completa de la Obra, conforme al programa de pagos acordado entre ambas partes.</p>
<p>Las facturas no pagadas dentro de los 10 días siguientes a su vencimiento generarán intereses al {{interest_rate}}% anual hasta su liquidación.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">5. Plazo</h2>
<p>El Contratista dará inicio a la Obra a más tardar el {{start_date}} y logrará la terminación sustancial a más tardar el {{end_date}}, sujeto a retrasos imputables al Propietario, Órdenes de Cambio o eventos de Fuerza Mayor.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">6. Permisos y Autorizaciones</h2>
<p>El Contratista obtendrá y pagará todos los permisos de construcción y autorizaciones gubernamentales requeridos para la Obra. El Propietario cooperará y firmará los documentos razonablemente necesarios para obtener dichos permisos.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">7. Seguros</h2>
<p>El Contratista mantendrá, a su cargo, un seguro de responsabilidad civil general y un seguro de compensación para trabajadores por montos habituales para el alcance de la obra, y proporcionará certificados de seguro al Propietario cuando lo solicite.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">8. Indemnización</h2>
<p>El Contratista indemnizará, defenderá y mantendrá indemne al Propietario frente a cualquier reclamación, daño, pérdida o gasto derivado de la ejecución de la Obra, en la medida en que sea causado por actos u omisiones negligentes del Contratista o sus subcontratistas.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">9. Garantía</h2>
<p>El Contratista garantiza que toda la Obra se ejecutará de manera profesional y conforme a este Contrato. El Contratista corregirá, sin costo adicional para el Propietario, cualquier defecto descubierto dentro de un (1) año posterior a la terminación sustancial.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">10. Incumplimiento y Remedios</h2>
<p>Si cualquiera de las partes incumple materialmente sus obligaciones, la parte no incumplidora proporcionará un aviso escrito especificando el incumplimiento. La parte incumplidora contará con {{cure_days}} días calendario para subsanar el incumplimiento. De no hacerlo, la parte no incumplidora podrá dar por terminado este Contrato y ejercer los recursos legales disponibles.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">11. Fuerza Mayor</h2>
<p>Ninguna de las partes será responsable por retrasos causados por actos de Dios, desastres naturales, órdenes gubernamentales, huelgas laborales, pandemias u otros eventos fuera del control razonable de la parte afectada, siempre que se notifique de manera oportuna.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">12. Resolución Alternativa de Controversias</h2>
<p>Cualquier controversia derivada de este Contrato se someterá primero a mediación no vinculante. Si la mediación fracasa, las partes acuerdan resolver las disputas mediante arbitraje vinculante bajo las reglas de la Asociación Americana de Arbitraje antes de recurrir a litigios.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">13. Ley Aplicable</h2>
<p>Este Contrato se regirá e interpretará conforme a las leyes del Estado de {{contractor_state}}, sin considerar sus disposiciones sobre conflictos de leyes.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">14. Acuerdo Íntegro</h2>
<p>Este Contrato constituye el acuerdo completo entre las partes y reemplaza todas las negociaciones, declaraciones o acuerdos previos. Las enmiendas deben ser por escrito y firmadas por ambas partes.</p>

<div style="margin-top:56px;display:flex;gap:48px;">
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Firma del Contratista</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{contractor_name}} — {{contractor_company}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Fecha: _______________</p>
  </div>
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Firma del Propietario</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{owner_name}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Fecha: _______________</p>
  </div>
</div>
</div>`,
  },

  // ─────────────────────────────────────────────────────────────
  // 3. HOME IMPROVEMENT CONTRACT — EN
  // ─────────────────────────────────────────────────────────────
  {
    type: "remodeling",
    language: "en",
    title: "Home Improvement Contract",
    isActive: true,
    content: `<div style="font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px 32px;color:#1a1a1a;line-height:1.7;">
<h1 style="text-align:center;font-size:22px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Home Improvement Contract</h1>
<p style="text-align:center;margin-top:0;font-size:13px;color:#555;">Effective Date: {{effective_date}}</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">1. Parties</h2>
<p>This Home Improvement Contract ("Agreement") is entered into as of {{effective_date}}, by and between:</p>
<p><strong>Homeowner:</strong> {{owner_name}}, at {{owner_address}} ("Owner").</p>
<p><strong>Contractor:</strong> {{contractor_name}}, d/b/a {{contractor_company}}, at {{contractor_address}}, License No. {{contractor_license}}, State of {{contractor_state}}, Phone: {{contractor_phone}} ("Contractor").</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">2. Property Address</h2>
<p>Work shall be performed at: {{project_address}}.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">3. Scope of Work</h2>
<p>Contractor shall perform the following home improvement work ("Work"):</p>
<p>{{project_description}}</p>
<p>Any additional work outside this scope requires a written Change Order executed by both parties.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">4. Contract Price &amp; Payment Schedule</h2>
<p>The total contract price is <strong>{{contract_amount}}</strong>, payable per the agreed draw schedule. Payments not received within 10 days of the due date shall bear interest at {{interest_rate}}% per annum.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">5. Project Schedule</h2>
<p>Work shall commence on {{start_date}} and be substantially complete by {{end_date}}, subject to weather delays, Owner-caused delays, Change Orders, and Force Majeure events.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">6. Materials &amp; Substitutions</h2>
<p>All materials shall be new, of good quality, and as specified. Substitutions shall be approved in writing by Owner prior to installation. Contractor shall maintain documentation of all materials used.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">7. Subcontractors</h2>
<p>Contractor may engage subcontractors for portions of the Work, but Contractor remains solely responsible to Owner for the performance of all Work and compliance with this Agreement.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">8. Permits &amp; Inspections</h2>
<p>Contractor shall secure all required permits and schedule all required inspections. Costs of permits are included in the contract price unless otherwise noted.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">9. Site Conditions &amp; Access</h2>
<p>Owner shall provide Contractor reasonable access to the property during normal working hours. Contractor shall keep the work site reasonably clean and free of debris, removing all waste upon completion.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">10. Change Orders</h2>
<p>Any changes to the scope, price, or schedule must be documented in a written Change Order signed by both parties before the changed work begins. Verbal authorizations are not binding.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">11. Insurance</h2>
<p>Contractor shall carry general liability and workers' compensation insurance and provide Owner with certificates upon request. Owner is encouraged to verify coverage independently.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">12. Lien Waiver</h2>
<p>Upon receipt of each progress payment, Contractor shall provide a partial lien waiver for work completed through that payment date. A final unconditional lien waiver shall be delivered upon receipt of final payment.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">13. Substantial Completion &amp; Punch List</h2>
<p>Substantial completion occurs when the Work is sufficiently complete for Owner's intended use. A punch list of minor remaining items shall be prepared at that time and completed within 14 days.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">14. Warranty</h2>
<p>Contractor warrants all labor and materials for one (1) year from the date of substantial completion. Manufacturer warranties on materials are passed through to Owner where applicable.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">15. Hazardous Materials</h2>
<p>Contractor is not responsible for the identification or abatement of pre-existing hazardous materials (e.g., asbestos, lead paint) unless expressly included in the scope of work. Discovery of such materials may result in a Change Order.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">16. Indemnification</h2>
<p>Each party shall indemnify and hold harmless the other from claims arising from their own negligent acts or omissions in connection with the Work.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">17. Default &amp; Cure Period</h2>
<p>Written notice of default must be provided, and the defaulting party shall have {{cure_days}} calendar days to cure. If uncured, the non-defaulting party may terminate and seek available remedies.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">18. Limitation of Liability</h2>
<p>Contractor's total liability under this Agreement shall not exceed the total contract price paid by Owner, except in cases of gross negligence or willful misconduct.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">19. Force Majeure</h2>
<p>Neither party shall be liable for delays caused by circumstances beyond their reasonable control, provided prompt written notice is given to the other party.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">20. Dispute Resolution</h2>
<p>Disputes shall first be submitted to mediation. If unresolved, parties agree to binding arbitration in the State of {{contractor_state}} under AAA rules, with costs shared equally unless otherwise awarded.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">21. Governing Law</h2>
<p>This Agreement is governed by the laws of the State of {{contractor_state}}.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">22. Entire Agreement</h2>
<p>This Agreement is the entire understanding between the parties. No oral modifications are binding. Amendments require written signatures of both parties.</p>

<div style="margin-top:56px;display:flex;gap:48px;">
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Contractor Signature</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{contractor_name}} — {{contractor_company}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Date: _______________</p>
  </div>
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Homeowner Signature</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{owner_name}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Date: _______________</p>
  </div>
</div>
</div>`,
  },

  // ─────────────────────────────────────────────────────────────
  // 4. CONTRATO DE REMODELACIÓN — ES
  // ─────────────────────────────────────────────────────────────
  {
    type: "remodeling",
    language: "es",
    title: "Contrato de Remodelación",
    isActive: true,
    content: `<div style="font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px 32px;color:#1a1a1a;line-height:1.7;">
<h1 style="text-align:center;font-size:22px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Contrato de Remodelación</h1>
<p style="text-align:center;margin-top:0;font-size:13px;color:#555;">Fecha de vigencia: {{effective_date}}</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">1. Partes</h2>
<p>Este Contrato de Remodelación ("Contrato") se celebra el {{effective_date}}, entre:</p>
<p><strong>Propietario:</strong> {{owner_name}}, con domicilio en {{owner_address}} ("Propietario").</p>
<p><strong>Contratista:</strong> {{contractor_name}}, con nombre comercial {{contractor_company}}, domicilio en {{contractor_address}}, Licencia No. {{contractor_license}}, Estado de {{contractor_state}}, Teléfono: {{contractor_phone}} ("Contratista").</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">2. Dirección de la Propiedad</h2>
<p>Los trabajos se realizarán en: {{project_address}}.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">3. Alcance de los Trabajos</h2>
<p>El Contratista realizará los siguientes trabajos de remodelación ("Obra"):</p>
<p>{{project_description}}</p>
<p>Cualquier trabajo adicional fuera de este alcance requiere una Orden de Cambio escrita firmada por ambas partes antes de iniciar los trabajos adicionales.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">4. Precio del Contrato y Programa de Pagos</h2>
<p>El precio total del contrato es de <strong>{{contract_amount}}</strong>, pagadero conforme al programa de pagos acordado. Los pagos no recibidos dentro de los 10 días siguientes a su vencimiento generarán intereses al {{interest_rate}}% anual.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">5. Programa de Obra</h2>
<p>Los trabajos iniciarán el {{start_date}} y se completarán sustancialmente el {{end_date}}, sujeto a retrasos por condiciones climáticas, causas imputables al Propietario, Órdenes de Cambio y eventos de Fuerza Mayor.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">6. Materiales y Sustituciones</h2>
<p>Todos los materiales serán nuevos, de buena calidad y conforme a las especificaciones acordadas. Las sustituciones requerirán aprobación escrita del Propietario antes de su instalación.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">7. Subcontratistas</h2>
<p>El Contratista podrá contratar subcontratistas para partes de la Obra, pero seguirá siendo el único responsable ante el Propietario por el cumplimiento de todo el trabajo y del presente Contrato.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">8. Permisos e Inspecciones</h2>
<p>El Contratista obtendrá todos los permisos requeridos y coordinará las inspecciones necesarias. Los costos de permisos están incluidos en el precio del contrato salvo indicación contraria.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">9. Condiciones del Sitio y Acceso</h2>
<p>El Propietario proporcionará al Contratista acceso razonable a la propiedad durante el horario normal de trabajo. El Contratista mantendrá el sitio razonablemente limpio y retirará los desechos al concluir la Obra.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">10. Órdenes de Cambio</h2>
<p>Cualquier modificación al alcance, precio o programa deberá documentarse en una Orden de Cambio escrita firmada por ambas partes antes de iniciar los trabajos modificados. Las autorizaciones verbales no son vinculantes.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">11. Seguros</h2>
<p>El Contratista mantendrá seguros de responsabilidad civil y compensación para trabajadores, y proporcionará certificados al Propietario cuando éste lo solicite.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">12. Renuncia de Gravámenes</h2>
<p>Al recibir cada pago parcial, el Contratista entregará una renuncia parcial de gravámenes por los trabajos cubiertos. Al recibir el pago final, entregará una renuncia incondicional de gravámenes.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">13. Terminación Sustancial y Lista de Pendientes</h2>
<p>La terminación sustancial ocurre cuando la Obra está suficientemente completa para el uso previsto. Se elaborará una lista de pendientes menores que deberán completarse en un plazo de 14 días.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">14. Garantía</h2>
<p>El Contratista garantiza toda la mano de obra y los materiales por un (1) año a partir de la fecha de terminación sustancial. Las garantías de fabricante se trasladan al Propietario cuando aplique.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">15. Materiales Peligrosos</h2>
<p>El Contratista no es responsable de identificar ni remediar materiales peligrosos preexistentes (asbesto, pintura con plomo, etc.) a menos que estén expresamente incluidos en el alcance. Su descubrimiento podrá originar una Orden de Cambio.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">16. Indemnización</h2>
<p>Cada parte indemnizará y mantendrá indemne a la otra por reclamaciones derivadas de sus propios actos u omisiones negligentes en relación con la Obra.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">17. Incumplimiento y Período de Subsanación</h2>
<p>Deberá notificarse el incumplimiento por escrito, y la parte incumplidora tendrá {{cure_days}} días calendario para subsanarlo. De no hacerlo, la parte no incumplidora podrá dar por terminado el Contrato y ejercer los recursos disponibles.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">18. Limitación de Responsabilidad</h2>
<p>La responsabilidad total del Contratista bajo este Contrato no excederá el precio total pagado por el Propietario, salvo en casos de negligencia grave o conducta dolosa.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">19. Fuerza Mayor</h2>
<p>Ninguna parte será responsable por retrasos causados por circunstancias fuera de su control razonable, siempre que se notifique oportunamente por escrito a la otra parte.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">20. Resolución de Controversias</h2>
<p>Las disputas se someterán primero a mediación. Si no se resuelven, las partes acuerdan arbitraje vinculante en el Estado de {{contractor_state}} bajo las reglas de la AAA, con costos compartidos en partes iguales salvo que se resuelva lo contrario.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">21. Ley Aplicable</h2>
<p>Este Contrato se rige por las leyes del Estado de {{contractor_state}}.</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">22. Acuerdo Íntegro</h2>
<p>Este Contrato es el entendimiento completo entre las partes. No se aceptan modificaciones verbales. Las enmiendas requieren firmas escritas de ambas partes.</p>

<div style="margin-top:56px;display:flex;gap:48px;">
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Firma del Contratista</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{contractor_name}} — {{contractor_company}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Fecha: _______________</p>
  </div>
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Firma del Propietario</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{owner_name}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Fecha: _______________</p>
  </div>
</div>
</div>`,
  },

  // ─────────────────────────────────────────────────────────────
  // 5. CHANGE ORDER — EN
  // ─────────────────────────────────────────────────────────────
  {
    type: "change_order",
    language: "en",
    title: "Change Order",
    isActive: true,
    content: `<div style="font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px 32px;color:#1a1a1a;line-height:1.7;">
<h1 style="text-align:center;font-size:22px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Change Order No. {{co_number}}</h1>
<p style="text-align:center;margin-top:0;font-size:13px;color:#555;">Date: {{effective_date}}</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Project Information</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
  <tr><td style="padding:6px 0;width:40%;color:#555;">Project Name</td><td style="padding:6px 0;"><strong>{{project_name}}</strong></td></tr>
  <tr style="background:#f9f9f9;"><td style="padding:6px 4px;color:#555;">Project Address</td><td style="padding:6px 4px;"><strong>{{project_address}}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#555;">Contractor</td><td style="padding:6px 0;"><strong>{{contractor_name}} — {{contractor_company}}</strong></td></tr>
  <tr style="background:#f9f9f9;"><td style="padding:6px 4px;color:#555;">Owner</td><td style="padding:6px 4px;"><strong>{{owner_name}}</strong></td></tr>
</table>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Description of Change</h2>
<p>{{change_description}}</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Financial Impact</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
  <tr style="background:#f3f3f3;"><td style="padding:8px;color:#555;">Original Contract Amount</td><td style="padding:8px;text-align:right;">{{original_amount}}</td></tr>
  <tr><td style="padding:8px;color:#555;">Amount of This Change Order</td><td style="padding:8px;text-align:right;"><strong>{{change_amount}}</strong></td></tr>
  <tr style="background:#f3f3f3;font-weight:bold;"><td style="padding:8px;">New Contract Total</td><td style="padding:8px;text-align:right;">{{new_total}}</td></tr>
</table>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Schedule Impact</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
  <tr style="background:#f3f3f3;"><td style="padding:8px;width:60%;color:#555;">Additional Days Added to Schedule</td><td style="padding:8px;text-align:right;">{{additional_days}} days</td></tr>
  <tr><td style="padding:8px;color:#555;">New Substantial Completion Date</td><td style="padding:8px;text-align:right;"><strong>{{new_completion_date}}</strong></td></tr>
</table>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Terms &amp; Conditions</h2>
<p style="font-size:13px;">This Change Order, when signed by both parties, becomes part of and is in accordance with the terms of the original contract. All other terms and conditions of the original contract remain in full force and effect. The Contractor shall not proceed with the changed work until this Change Order has been executed by both parties.</p>

<div style="margin-top:48px;display:flex;gap:48px;">
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Contractor Signature</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{contractor_name}} — {{contractor_company}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Date: _______________</p>
  </div>
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Owner Signature</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{owner_name}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Date: _______________</p>
  </div>
</div>
</div>`,
  },

  // ─────────────────────────────────────────────────────────────
  // 6. ORDEN DE CAMBIO — ES
  // ─────────────────────────────────────────────────────────────
  {
    type: "change_order",
    language: "es",
    title: "Orden de Cambio",
    isActive: true,
    content: `<div style="font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px 32px;color:#1a1a1a;line-height:1.7;">
<h1 style="text-align:center;font-size:22px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Orden de Cambio No. {{co_number}}</h1>
<p style="text-align:center;margin-top:0;font-size:13px;color:#555;">Fecha: {{effective_date}}</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Información del Proyecto</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
  <tr><td style="padding:6px 0;width:40%;color:#555;">Nombre del Proyecto</td><td style="padding:6px 0;"><strong>{{project_name}}</strong></td></tr>
  <tr style="background:#f9f9f9;"><td style="padding:6px 4px;color:#555;">Dirección del Proyecto</td><td style="padding:6px 4px;"><strong>{{project_address}}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#555;">Contratista</td><td style="padding:6px 0;"><strong>{{contractor_name}} — {{contractor_company}}</strong></td></tr>
  <tr style="background:#f9f9f9;"><td style="padding:6px 4px;color:#555;">Propietario</td><td style="padding:6px 4px;"><strong>{{owner_name}}</strong></td></tr>
</table>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Descripción del Cambio</h2>
<p>{{change_description}}</p>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Impacto Financiero</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
  <tr style="background:#f3f3f3;"><td style="padding:8px;color:#555;">Monto Original del Contrato</td><td style="padding:8px;text-align:right;">{{original_amount}}</td></tr>
  <tr><td style="padding:8px;color:#555;">Monto de Esta Orden de Cambio</td><td style="padding:8px;text-align:right;"><strong>{{change_amount}}</strong></td></tr>
  <tr style="background:#f3f3f3;font-weight:bold;"><td style="padding:8px;">Nuevo Total del Contrato</td><td style="padding:8px;text-align:right;">{{new_total}}</td></tr>
</table>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Impacto en el Programa de Obra</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
  <tr style="background:#f3f3f3;"><td style="padding:8px;width:60%;color:#555;">Días Adicionales al Programa</td><td style="padding:8px;text-align:right;">{{additional_days}} días</td></tr>
  <tr><td style="padding:8px;color:#555;">Nueva Fecha de Terminación Sustancial</td><td style="padding:8px;text-align:right;"><strong>{{new_completion_date}}</strong></td></tr>
</table>

<h2 style="font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:32px;">Términos y Condiciones</h2>
<p style="font-size:13px;">Esta Orden de Cambio, una vez firmada por ambas partes, forma parte y se rige conforme a los términos del contrato original. Todos los demás términos y condiciones del contrato original permanecen vigentes en su totalidad. El Contratista no procederá con los trabajos modificados hasta que ambas partes hayan firmado esta Orden de Cambio.</p>

<div style="margin-top:48px;display:flex;gap:48px;">
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Firma del Contratista</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{contractor_name}} — {{contractor_company}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Fecha: _______________</p>
  </div>
  <div style="flex:1;border-top:1px solid #555;padding-top:8px;">
    <p style="margin:0;font-size:12px;color:#555;">Firma del Propietario</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">{{owner_name}}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">Fecha: _______________</p>
  </div>
</div>
</div>`,
  },
];

export async function seedTemplates() {
  const existing = await db.select().from(contractTemplatesTable).limit(1);
  if (existing.length > 0) {
    console.log("contract_templates already seeded — skipping.");
    return;
  }
  await db.insert(contractTemplatesTable).values(templates);
  console.log(`Inserted ${templates.length} contract templates.`);
}
