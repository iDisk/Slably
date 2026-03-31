export type ActivityType = 'inspection' | 'draw' | 'contract' | 'milestone' | 'default';

export interface Activity {
  text: string;
  type?: ActivityType;
}

export interface Phase {
  title: string;
  icon: string;
  sub: string;
  activities: Activity[];
}

export interface ProjectCatalog {
  label: string;
  phases: Phase[];
}

export type ProjectType = 'new' | 'remo';

export const ACTIVITY_CATALOG: Record<ProjectType, ProjectCatalog> = {
  new: {
    label: 'Nueva Construcción',
    phases: [
      {
        title: 'Pre-Construcción',
        icon: '📐',
        sub: 'Permisos · contratos · planeación',
        activities: [
          { text: 'Reunión inicial y levantamiento de necesidades', type: 'milestone' },
          { text: 'Estudio de suelo (soil test / geotechnical report)' },
          { text: 'Levantamiento topográfico del terreno' },
          { text: 'Diseño arquitectónico y planos' },
          { text: 'Ingeniería estructural' },
          { text: 'Trámite de permisos de construcción (Building Permit)', type: 'milestone' },
          { text: 'Aprobación de planos por el municipio / ciudad' },
          { text: 'Contratación de servicios (agua, luz, gas — utilities)' },
          { text: 'Firma del contrato con el cliente', type: 'contract' },
          { text: 'Definición del draw schedule', type: 'draw' },
          { text: 'Selección y contratación de subcontratistas clave' },
        ],
      },
      {
        title: 'Preparación del Terreno',
        icon: '🚜',
        sub: 'Site prep · excavación',
        activities: [
          { text: 'Limpieza y desmonte del terreno (clearing & grubbing)' },
          { text: 'Marcado del terreno (staking & layout)' },
          { text: 'Demolición de estructuras existentes (si aplica)' },
          { text: 'Excavación' },
          { text: 'Nivelación y compactación del suelo' },
          { text: 'Instalación de sistemas temporales (luz y agua temporal)' },
          { text: 'Instalación de cercado de seguridad y señalización' },
        ],
      },
      {
        title: 'Cimentación',
        icon: '🪨',
        sub: 'Foundation · concreto',
        activities: [
          { text: 'Trazo de cimentación' },
          { text: 'Excavación de zapatas y vigas de cimentación' },
          { text: 'Instalación de acero de refuerzo (rebar)' },
          { text: 'Instalación de tuberías bajo losa (plomería rough-in)' },
          { text: 'Colado de concreto (concrete pour)' },
          { text: 'Curado del concreto' },
          { text: 'Impermeabilización de cimentación' },
          { text: 'Inspección de cimentación (Foundation Inspection)', type: 'inspection' },
          { text: 'Draw #1 — Cobro de cimentación', type: 'draw' },
        ],
      },
      {
        title: 'Estructura',
        icon: '🪵',
        sub: 'Framing · muros · techo',
        activities: [
          { text: 'Instalación de anclas y placa base (sill plate)' },
          { text: 'Levantamiento de muros (wall framing)' },
          { text: 'Instalación de vigas y trabes (beam installation)' },
          { text: 'Estructura de techo (roof framing)' },
          { text: 'Instalación de OSB / sheathing en muros y techo' },
          { text: 'Instalación de ventanas y puertas exteriores (rough)' },
          { text: 'Inspección de estructura (Framing Inspection)', type: 'inspection' },
          { text: 'Draw #2 — Cobro de estructura', type: 'draw' },
        ],
      },
      {
        title: 'Instalaciones MEP Rough-In',
        icon: '⚡',
        sub: 'Plomería · electricidad · HVAC',
        activities: [
          { text: 'Plomería aguas negras y pluviales (drain, waste, vent rough-in)' },
          { text: 'Plomería de agua fría y caliente (supply rough-in)' },
          { text: 'Instalación eléctrica (electrical rough-in — paneles, cableado)' },
          { text: 'Instalación de HVAC (ductos, unidades, rough-in)' },
          { text: 'Instalación de gas (gas rough-in)' },
          { text: 'Inspección de plomería rough-in', type: 'inspection' },
          { text: 'Inspección eléctrica rough-in', type: 'inspection' },
          { text: 'Inspección de HVAC', type: 'inspection' },
          { text: 'Draw #3 — Cobro de instalaciones', type: 'draw' },
        ],
      },
      {
        title: 'Cerramiento y Envolvente',
        icon: '🏠',
        sub: 'Techo · fachada · aislamiento',
        activities: [
          { text: 'Instalación de membrana impermeable (house wrap / weather barrier)' },
          { text: 'Instalación de aislamiento térmico (insulation)' },
          { text: 'Inspección de aislamiento', type: 'inspection' },
          { text: 'Instalación de revestimiento exterior (siding, stucco, brick)' },
          { text: 'Instalación de cubierta de techo (roofing — shingles, tile, metal)' },
          { text: 'Instalación de canaletas y bajadas pluviales (gutters)' },
          { text: 'Sellado de ventanas y puertas exteriores' },
        ],
      },
      {
        title: 'Terminados Interiores',
        icon: '🎨',
        sub: 'Drywall · pisos · pintura · acabados',
        activities: [
          { text: 'Instalación de tablaroca / drywall (hanging)' },
          { text: 'Cintado y espachillado de drywall (taping & mudding)' },
          { text: 'Textura de muros y techo' },
          { text: 'Pintura de primer y acabado (interior painting)' },
          { text: 'Instalación de pisos (tile, wood, LVP)' },
          { text: 'Instalación de gabinetes de cocina y baños' },
          { text: 'Instalación de encimeras (countertops)' },
          { text: 'Terminados de plomería (trim-out — llaves, regaderas)' },
          { text: 'Terminados eléctricos (contactos, apagadores, luminarias)' },
          { text: 'Terminados de HVAC (rejillas, termostatos)' },
          { text: 'Instalación de puertas interiores y herrajes' },
          { text: 'Instalación de molduras (baseboards, casings, crown molding)' },
        ],
      },
      {
        title: 'Terminados Exteriores',
        icon: '🌿',
        sub: 'Driveways · landscaping · bardas',
        activities: [
          { text: 'Concreto o pavimento de entrada (driveway)' },
          { text: 'Banqueta y accesos (sidewalk, walkways)' },
          { text: 'Landscaping básico / siembra de pasto' },
          { text: 'Bardas o cercas perimetrales' },
          { text: 'Instalación de garaje (si aplica)' },
        ],
      },
      {
        title: 'Cierre y Entrega',
        icon: '🔑',
        sub: 'Punch list · inspección final · entrega',
        activities: [
          { text: 'Punch list — revisión de pendientes con el cliente', type: 'milestone' },
          { text: 'Inspección final del municipio (Certificate of Occupancy)', type: 'inspection' },
          { text: 'Inspección final eléctrica', type: 'inspection' },
          { text: 'Inspección final de plomería', type: 'inspection' },
          { text: 'Limpieza final (post-construction cleaning)' },
          { text: 'Entrega de manuales y garantías al cliente' },
          { text: 'Firma de acta de entrega', type: 'contract' },
          { text: 'Draw final — cobro de saldo', type: 'draw' },
          { text: 'Firma de lien waivers finales (Unconditional Final)', type: 'contract' },
          { text: 'Cierre de expediente del proyecto', type: 'milestone' },
        ],
      },
    ],
  },
  remo: {
    label: 'Remodelación',
    phases: [
      {
        title: 'Pre-Proyecto',
        icon: '📋',
        sub: 'Diagnóstico · scope · contrato',
        activities: [
          { text: 'Visita de diagnóstico y levantamiento en sitio', type: 'milestone' },
          { text: 'Documentación fotográfica del estado actual (Before)' },
          { text: 'Medición y planos del espacio existente' },
          { text: 'Identificación de instalaciones ocultas (electricidad, plomería, HVAC)' },
          { text: 'Identificación de materiales con asbesto o plomo (casas antiguas)' },
          { text: 'Definición del alcance del trabajo con el cliente (Scope of Work)' },
          { text: 'Cotización detallada por partidas' },
          { text: 'Selección de materiales y acabados con el cliente' },
          { text: 'Firma del contrato y change order policy', type: 'contract' },
          { text: 'Tramitación de permisos (si aplica — ampliaciones, cambios estructurales)' },
        ],
      },
      {
        title: 'Protección y Demolición',
        icon: '🦺',
        sub: 'Demo · retiro de escombro',
        activities: [
          { text: 'Protección de áreas adyacentes (plásticos, cintas, lonas)' },
          { text: 'Desconexión de servicios en el área de trabajo' },
          { text: 'Desmontaje de gabinetes, muebles y accesorios existentes' },
          { text: 'Demolición de muros (verificar si son de carga)' },
          { text: 'Demolición de pisos existentes' },
          { text: 'Demolición de azulejo / tile existente' },
          { text: 'Demolición de tablaroca / drywall' },
          { text: 'Retiro y disposición de escombro (debris removal)' },
          { text: 'Inspección post-demolición — estado de instalaciones ocultas', type: 'inspection' },
        ],
      },
      {
        title: 'Trabajo Estructural',
        icon: '🏗️',
        sub: 'Si aplica — muros de carga · vigas',
        activities: [
          { text: 'Refuerzo o modificación de muros de carga' },
          { text: 'Instalación de vigas de carga (LVL beams, headers)' },
          { text: 'Apertura o cierre de vanos para ventanas y puertas' },
          { text: 'Nivelación de pisos existentes (floor leveling)' },
          { text: 'Inspección estructural (si se modificaron elementos de carga)', type: 'inspection' },
        ],
      },
      {
        title: 'Instalaciones Rough-In',
        icon: '⚡',
        sub: 'Plomería · eléctrico · HVAC',
        activities: [
          { text: 'Reubicación o extensión de plomería (supply y drain)' },
          { text: 'Actualización de panel eléctrico o subpanel (si aplica)' },
          { text: 'Reubicación o extensión de circuitos eléctricos' },
          { text: 'Modificación o extensión de HVAC / ductos' },
          { text: 'Instalación de ventilación (baños, cocinas — exhaust fans)' },
          { text: 'Inspección de plomería rough-in', type: 'inspection' },
          { text: 'Inspección eléctrica rough-in', type: 'inspection' },
          { text: 'Draw de mitad de proyecto — cobro parcial', type: 'draw' },
        ],
      },
      {
        title: 'Cerramiento Interior',
        icon: '🧱',
        sub: 'Drywall · aislamiento · impermeabilización',
        activities: [
          { text: 'Instalación de aislamiento térmico / acústico (si aplica)' },
          { text: 'Instalación de tablaroca / drywall' },
          { text: 'Cintado y espachillado' },
          { text: 'Textura de muros y techo' },
          { text: 'Impermeabilización de muros en baños y cocinas (wet areas)' },
        ],
      },
      {
        title: 'Terminados',
        icon: '✨',
        sub: 'Pisos · pintura · gabinetes · acabados',
        activities: [
          { text: 'Instalación de pisos (tile, madera, LVP, etc.)' },
          { text: 'Instalación de azulejo en muros de baños y cocinas' },
          { text: 'Pintura (primer + acabado)' },
          { text: 'Instalación de gabinetes' },
          { text: 'Instalación de encimeras' },
          { text: 'Terminados de plomería (faucets, toilets, showers, tubs)' },
          { text: 'Terminados eléctricos (contactos, apagadores, luminarias, ventiladores)' },
          { text: 'Terminados de HVAC' },
          { text: 'Instalación de puertas y herrajes' },
          { text: 'Instalación de molduras y carpintería de detalle' },
          { text: 'Instalación de espejos y accesorios de baño' },
          { text: 'Instalación de electrodomésticos (si aplica)' },
        ],
      },
      {
        title: 'Cierre',
        icon: '🔑',
        sub: 'Punch list · entrega · cobro final',
        activities: [
          { text: 'Punch list con el cliente — revisión de pendientes', type: 'milestone' },
          { text: 'Inspección final (si se tramitaron permisos)', type: 'inspection' },
          { text: 'Documentación fotográfica del resultado final (After)' },
          { text: 'Limpieza final' },
          { text: 'Entrega de garantías de materiales y mano de obra' },
          { text: 'Firma de acta de entrega', type: 'contract' },
          { text: 'Cobro de saldo final', type: 'draw' },
          { text: 'Firma de lien waivers finales', type: 'contract' },
          { text: 'Cierre de expediente', type: 'milestone' },
        ],
      },
    ],
  },
};
