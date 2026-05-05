export const marketingTranslations = {
  en: {
    nav: {
      wizard: "Wizard",
      styles: "Styles",
      rooms: "Rooms",
      how: "How it works",
      projects: "Projects",
      pricing: "Pricing",
      account: "Account",
      dashboard: "Dashboard",
      signOut: "Sign out",
      signIn: "Sign in",
      tryFree: "Try it free"
    },
    hero: {
      eyebrowPill: "NEW",
      eyebrow: "v1.0 · 4 rooms · 5 styles · ~40 items",
      title1: "Designed in",
      title2: "under 10 seconds",
      title3: ". Yours forever.",
      ledeSession: "Welcome back! Your projects are ready for you.",
      ledeAnon: "No CAD, no signup to try. Just a room you can walk into.",
      ledeBase: "Interior Flow 3D is an AI design copilot that generates a real, browseable 3D scene from a few simple choices.",
      ctaPrimary: "Try it free, no signup →",
      ctaSecondary: "See how it works",
      meta1: "10 free generations / day",
      meta2: "Anonymous trial",
      meta3: "Light & dark",
      tagLive: "live · auto-orbit",
      tagDim: "4×5m · scandinavian",
      rationaleLabel: "How it works · AI Rationale",
      rationaleTextPrefix: "I arranged the layout to maximize flow",
      rationaleTextSuffix: " while keeping the focus on natural light — every piece is selected to match your style and room constraints."
    },
    wizard_demo: {
      tag: "Try the wizard →",
      title: "Four steps. Ten seconds.",
      lede: "Tell us what you're designing, how big it is, and the feeling you' after. We handle the rest.",
      step1: "Room",
      step2: "Dimensions",
      step3: "Style",
      step4: "Preferences",
      step4Value: "Pick up to 2",
      back: "← Back",
      continue: "Continue →",
      generating: "Preparing...",
      generate: "Generate layout",
      wait: "~7s",
      panel1Title: "What are we designing?",
      panel1Sub: "We specialize in these four core home spaces.",
      panel2Title: "How big is the room?",
      panel2Sub: "Limits: {w0}-{w1}m wide · {l0}-{l1}m long.",
      width: "Width",
      length: "Length",
      height: "Height",
      floorArea: "Floor area",
      volume: "Volume",
      panel3Title: "Pick a style",
      panel3Sub: "Five hand-tuned design profiles.",
      panel4Title: "Anything you'd like more of?",
      panel4Sub: "Pick up to 2. Skip if you trust us.",
      youGet: "You'll get",
      get1: "A 3D scene you can orbit, zoom, and click into",
      get2: "A first-person rationale for every piece",
      get3: "A wall, floor, and accent palette ready to paint",
      roomTypes: {
        living_room: { name: "Living room", tag: "social & lounge" },
        bedroom: { name: "Bedroom", tag: "rest & retreat" },
        dining_room: { name: "Dining room", tag: "gather & eat" },
        home_office: { name: "Home office", tag: "focus & work" }
      },
      styles: {
        scandinavian: { name: "Scandinavian", tag: "— light & breathable" },
        minimal: { name: "Minimal", tag: "— quiet & spacious" },
        industrial: { name: "Industrial", tag: "— raw & considered" },
        japandi: { name: "Japandi", tag: "— grounded & calm" },
        mid_century: { name: "Mid-century", tag: "— warm & curated" }
      },
      prefs: {
        more_seating: "More seating",
        more_open_space: "More open space",
        more_storage: "More storage"
      }
    },
    sections: {
      wizard: {
        tag: "The wizard",
        title: "Three decisions. One layout.",
        lede: "Design your dream room in just three simple steps. No design experience needed! Try our interactive wizard below and see your ideas come to life."
      },
      twopass: {
        tag: "How it works",
        title: "Smart design. Flawless execution.",
        lede: "Our AI acts like a real interior designer. First, it figures out how the room should flow—creating separate zones for relaxing, working, or dining. Then, it carefully selects furniture that perfectly matches your style and space.",
        k1: "Intelligent Layouts",
        v1: "We create dedicated zones for different activities, making sure your space is functional and comfortable.",
        k2: "Curated Selection",
        v2: "Our AI handpicks pieces from our beautiful catalog that fit your exact style and room dimensions.",
        k3: "Perfect Placement",
        v3: "Every item is placed with purpose, ensuring natural pathways and a cohesive look.",
        step1: "Step 1",
        step1Title: "Understand your space",
        step1Text: "We analyze your room dimensions and preferred style to plan the perfect flow.",
        step2: "Step 2",
        step2Title: "Create functional zones",
        zone1: "Relaxing",
        zone2: "Entertainment",
        zone3: "Reading",
        step3: "Step 3",
        step3Title: "Place furniture",
        step3Text: "We select and arrange the best pieces to bring your vision to life instantly."
      },
      catalog: {
        tag: "Curated collection",
        title: "Endless possibilities. Tap any item to swap.",
        lede: "Every piece is carefully selected to work beautifully together. Don't love a particular chair? Just tap it in your 3D scene and we'll instantly suggest perfect alternatives that match your style.",
        replace: "Replace · 3 compatible",
        perfectMatch: "Perfect match · Fits seamlessly",
        stat1N: "40+",
        stat1K: "Curated items",
        stat2N: "20",
        stat2K: "Room styles",
        stat3N: "3D",
        stat3K: "Instant rendering",
        stat4N: "1",
        stat4K: "Click to swap"
      },
      rationale: {
        tag: "First-person voice",
        title: "Every choice, explained.",
        lede: "The model writes a short rationale for every piece, in the voice of a designer who's stood in the room. Click any item; we'll tell you why it's there.",
        quote: "I anchored the seating zone",
        quoteSuffix: " to the south wall to leave the window unobstructed and create a clear conversational triangle with the armchair.",
        attribution: "— Project overview · Park Slope · living room",
        items: [
          { name: "3-seat sofa · sofa_3seat", quote: "\"I placed the 3-seat sofa against the south wall to face the window and ground the seating zone.\"", color: "#7C5BFF" },
          { name: "Lounge chair · armchair", quote: "\"I added the armchair at a 45° angle to soften the rectangle and complete a conversational triangle.\"", color: "#E8855A" },
          { name: "Floor lamp · floor_lamp", quote: "\"I tucked the lamp into the NE corner — task light for the chair without crowding the rug.\"", color: "#7B8C6F" },
        ]
      },
      styles: {
        tag: "5 styles",
        title: "Five hand-tuned design profiles.",
        lede: "Each style is carefully crafted by professional interior designers to create harmonious, beautiful spaces. From cozy Scandinavian to sleek Minimalist, find the perfect vibe for your home."
      },
      rooms: {
        tag: "4 room types",
        title: "Living, bedroom, dining, office.",
        lede: "Whether you are redesigning a cozy bedroom or a productive home office, our AI understands the unique flow of each space to suggest the perfect furniture arrangement."
      },
      hierarchy: {
        tag: "Project → Room → Layout",
        title: "Organize a whole home.",
        lede: "Plan your entire home effortlessly. Organize different rooms, save multiple design ideas for each space, and pick your favorites. Designing a full house has never been this easy.",
        project: "Project",
        room: "Room",
        layout: "Layout",
        projectName: "Park Slope apartment",
        room1Name: "Living room · 4×5m",
        room2Name: "Bedroom · 3.5×4m",
        room3Name: "Dining room · 3.5×4.5m",
        room4Name: "Home office · 3×3m",
        layout1Name: "Bright + storage",
        layout2Name: "Cozy edition",
        layout3Name: "More open",
        primary: "primary"
      },
      compare: {
        tag: "A/B compare",
        title: "Drag to compare two variants.",
        lede: "Can't decide between two looks? Use our smooth comparison slider to easily view different designs in the exact same space. Making the perfect choice is just a swipe away."
      },
      share: {
        tag: "Share",
        title: "Send a link. No signup needed.",
        lede: "Every layout has a public, read-only share URL. The recipient sees the same 3D scene + rationale you do — no account, no app install. Revoke any time."
      },
      theme: {
        tag: "Light & dark",
        title: "Designed for both. Persisted per user.",
        lede: "Toggle in the top bar; we remember it. Every component, palette, and HDRI environment is tuned for both."
      },
      templates: {
        tag: "Curated templates",
        title: "Start from a beautifully designed space.",
        lede: "Copy an entire curated template to your own workspace in one click. Remix the style or tweak the layout.",
        items: [
          { name: "Sun-drenched Studio", meta: "Scandinavian · 28m²" },
          { name: "The Industrial Loft", meta: "Industrial · 45m²" },
          { name: "Zen Bedroom", meta: "Japandi · 18m²" },
        ]
      },
      trust: {
        tag: "Trust",
        title: "Powered by AI. Verified by designers.",
        lede: "We test thousands of layouts to make sure the AI respects clearances, traffic flow, and standard ergonomic spacing.",
        items: [
          { icon: "🔒", title: "Complete Privacy", text: "Your designs are entirely yours. We keep your projects secure and private, ensuring no one else can see your dream home without your permission." },
          { icon: "✨", title: "Instant Access", text: "No accounts required to start exploring. Try out our tools quickly and save your progress only when you're ready to commit." },
          { icon: "⚡", title: "Lightning Fast", text: "Enjoy seamless, instant rendering. Our optimized platform ensures you can see your design changes in real-time." },
          { icon: "🔗", title: "Easy Sharing", text: "Share your beautiful designs with friends or family via a simple link. You have full control and can turn off access whenever you choose." },
        ]
      },
      pricing: {
        tag: "Pricing",
        title: "Generous free tier. Pro if you need it.",
        lede: "Everything you need to design a home is free. Pro unlocks premium catalog items, higher-res exports, and priority queue.",
        freeName: "Free",
        freeAmount: "$0",
        freeSuffix: "forever",
        freeTagline: "Everything you need to design a home.",
        freeCTA: "Start free, no signup",
        proName: "Pro",
        proAmount: "$12",
        proSuffix: "/month · beta-free",
        proTagline: "For people designing more than one home.",
        proCTA: "Join the waitlist",
        comingSoon: "Coming soon",
        features: {
          gen10: "10 generations / day",
          unlimited: "Unlimited generations",
          allRooms: "All 4 room types & 5 styles",
          saveUnlimited: "Save unlimited projects & layouts",
          shareLinks: "Share read-only links",
          lightDark: "Light + dark mode",
          premiumLocked: "Premium catalog items (~5/style)",
          premiumUnlocked: "Premium catalog unlocked",
          hiRes: "Higher-resolution exports",
          priority: "Priority generation queue",
          earlyAccess: "Early access to new room types",
          support: "Email support",
          allFree: "All Free features"
        }
      },
      final: {
        title: "Try it free. No signup.",
        copy: "You'll have a 3D living room you can orbit in under 10 seconds. If you like it, save it. If you don't, close the tab.",
        cta: "Start the wizard →"
      },
      waitlist: {
        tag: "Pro Access",
        title: "Join the Pro waitlist",
        titleEm: "Pro waitlist",
        lede: "Be the first to unlock premium catalog items, high-res exports, and priority AI generation.",
        labelName: "Full Name",
        labelEmail: "Email Address",
        labelInterest: "Your Interest",
        interestIndividual: "Personal use / Home owner",
        interestDesigner: "Professional Interior Designer",
        interestAgent: "Real Estate Agent / Developer",
        interestOther: "Other",
        submit: "Join the waitlist",
        submitting: "Securing your spot...",
        privacy: "🔒 No spam. Early access only.",
        successTitle: "You're officially on the list.",
        successLede: "We've received your application. Keep an eye on your inbox for your exclusive invitation.",
        successCTA: "Return to site"
      },
      blog: {
        posts: [
          { eyebrow: "Engineering", title: "Why we run two LLM passes instead of one", excerpt: "How splitting zone selection from item selection cut our hallucination rate to near-zero.", meta: "8 min · Apr 24" },
          { eyebrow: "Design", title: "A small enum beats free-form prose every time", excerpt: "Why our LLM picks from a closed slot vocabulary and the server resolves coordinates.", meta: "5 min · Apr 11" },
          { eyebrow: "Catalog", title: "Compressing 40 GLBs into 8 megabytes", excerpt: "Our gltfpack + KTX2 pipeline, end-to-end, with the numbers.", meta: "6 min · Mar 28" },
        ]
      }
    },
    footer: {
      copy: "© 2026 Interior Flow 3D. All rights reserved.",
      tagline: "AI-generated interior design that feels intentional, explainable, and instantly visualizable.",
      product: "Product",
      wizard: "Wizard",
      styles: "Styles",
      rooms: "Rooms",
      pricing: "Pricing",
      features: "Features",
      smartLayouts: "Smart Layouts",
      easySwapping: "Easy Swapping",
      abCompare: "A/B Compare",
      share: "Share",
      connect: "Connect",
      repository: "Repository"
    }
  },
  es: {
    nav: {
      wizard: "Asistente",
      styles: "Estilos",
      rooms: "Habitaciones",
      how: "Cómo funciona",
      projects: "Proyectos",
      pricing: "Precios",
      account: "Cuenta",
      dashboard: "Panel",
      signOut: "Cerrar sesión",
      signIn: "Iniciar sesión",
      tryFree: "Pruébalo gratis"
    },
    hero: {
      eyebrowPill: "NUEVO",
      eyebrow: "v1.0 · 4 habitaciones · 5 estilos · ~40 artículos",
      title1: "Diseñado en",
      title2: "menos de 10 segundos",
      title3: ". Tuyo para siempre.",
      ledeSession: "¡Bienvenido de nuevo! Tus proyectos te están esperando.",
      ledeAnon: "Sin CAD ni necesidad de registro para probar. Simplemente una habitación por la que puedes caminar.",
      ledeBase: "Interior Flow 3D es un copiloto de diseño por IA que genera una escena 3D navegable y real a través de unas cuantas decisiones simples.",
      ctaPrimary: "Pruébalo gratis, sin registro →",
      ctaSecondary: "Mira cómo funciona",
      meta1: "10 generaciones gratis / día",
      meta2: "Prueba anónima",
      meta3: "Claro y oscuro",
      tagLive: "en vivo · auto-rotación",
      tagDim: "4×5m · nórdico",
      rationaleLabel: "Cómo funciona · Razonamiento IA",
      rationaleTextPrefix: "Organicé el espacio para maximizar el flujo",
      rationaleTextSuffix: " manteniendo el enfoque en la luz natural — cada pieza está seleccionada para coincidir con tu estilo y las dimensiones de la habitación."
    },
    wizard_demo: {
      tag: "Prueba el asistente →",
      title: "Cuatro pasos. Diez segundos.",
      lede: "Dinos qué estás diseñando, qué tamaño tiene y la sensación que buscas. Nosotros nos encargamos del resto.",
      step1: "Habitación",
      step2: "Dimensiones",
      step3: "Estilo",
      step4: "Preferencias",
      step4Value: "Elige hasta 2",
      back: "← Atrás",
      continue: "Continuar →",
      generating: "Preparando...",
      generate: "Generar diseño",
      wait: "~7s",
      panel1Title: "¿Qué vamos a diseñar?",
      panel1Sub: "Nos especializamos en estos cuatro espacios principales del hogar.",
      panel2Title: "¿Qué tamaño tiene la habitación?",
      panel2Sub: "Límites: {w0}-{w1}m ancho · {l0}-{l1}m largo.",
      width: "Ancho",
      length: "Largo",
      height: "Alto",
      floorArea: "Área del suelo",
      volume: "Volumen",
      panel3Title: "Elige un estilo",
      panel3Sub: "Cinco perfiles de diseño ajustados a mano.",
      panel4Title: "¿Algo de lo que te gustaría más?",
      panel4Sub: "Elige hasta 2. Salta si confías en nosotros.",
      youGet: "Obtendrás",
      get1: "Una escena 3D que puedes orbitar, ampliar y explorar",
      get2: "Un análisis en primera persona de cada pieza",
      get3: "Una paleta de paredes, suelos y acentos lista para aplicar",
      roomTypes: {
        living_room: { name: "Salón", tag: "social y relax" },
        bedroom: { name: "Dormitorio", tag: "descanso y retiro" },
        dining_room: { name: "Comedor", tag: "reunión y comida" },
        home_office: { name: "Oficina en casa", tag: "enfoque y trabajo" }
      },
      styles: {
        scandinavian: { name: "Nórdico", tag: "— ligero y transpirable" },
        minimal: { name: "Minimalista", tag: "— tranquilo y espacioso" },
        industrial: { name: "Industrial", tag: "— crudo y meditado" },
        japandi: { name: "Japandi", tag: "— equilibrado y sereno" },
        mid_century: { name: "Mid-century", tag: "— cálido y curado" }
      },
      prefs: {
        more_seating: "Más asientos",
        more_open_space: "Más espacio abierto",
        more_storage: "Más almacenamiento"
      }
    },
    sections: {
      wizard: {
        tag: "El asistente",
        title: "Cuatro pasos. Diez segundos.",
        lede: "Dinos qué estás diseñando, qué tamaño tiene y el sentimiento que buscas. Nosotros nos encargamos del resto."
      },
      twopass: {
        tag: "Cómo funciona",
        title: "Diseño inteligente. Ejecución impecable.",
        lede: "Nuestra IA actúa como un diseñador de interiores real. Primero, determina cómo debe fluir la habitación, creando zonas separadas para relajarse, trabajar o cenar. Luego, selecciona cuidadosamente los muebles que combinan perfectamente con tu estilo y espacio.",
        k1: "Diseños Inteligentes",
        v1: "Creamos zonas dedicadas para diferentes actividades, asegurándonos de que tu espacio sea funcional y cómodo.",
        k2: "Selección Curada",
        v2: "Nuestra IA elige piezas de nuestro hermoso catálogo que se ajustan a tu estilo exacto y a las dimensiones de tu habitación.",
        k3: "Colocación Perfecta",
        v3: "Cada artículo se coloca con un propósito, garantizando caminos naturales y un aspecto cohesivo.",
        step1: "Paso 1",
        step1Title: "Entiende tu espacio",
        step1Text: "Analizamos las dimensiones de tu habitación y tu estilo preferido para planificar el flujo perfecto.",
        step2: "Paso 2",
        step2Title: "Crea zonas funcionales",
        zone1: "Relax",
        zone2: "Entretenimiento",
        zone3: "Lectura",
        step3: "Paso 3",
        step3Title: "Coloca los muebles",
        step3Text: "Seleccionamos y organizamos las mejores piezas para dar vida a tu visión al instante."
      },
      catalog: {
        tag: "Colección curada",
        title: "Posibilidades infinitas. Toca cualquier artículo para cambiarlo.",
        lede: "Cada pieza se selecciona cuidadosamente para que funcione de maravilla en conjunto. ¿No te gusta una silla en particular? Simplemente tócala en tu escena 3D y te sugeriremos instantáneamente alternativas perfectas que combinen con tu estilo.",
        replace: "Reemplazar · 3 compatibles",
        perfectMatch: "Combinación perfecta · Se ajusta sin problemas",
        stat1N: "40+",
        stat1K: "Artículos curados",
        stat2N: "20",
        stat2K: "Estilos de habitación",
        stat3N: "3D",
        stat3K: "Renderizado instantáneo",
        stat4N: "1",
        stat4K: "Clic para cambiar"
      },
      rationale: {
        tag: "Voz en primera persona",
        title: "Cada elección, explicada.",
        lede: "El modelo escribe un breve razonamiento para cada pieza, con la voz de un diseñador que ha estado en la habitación. Haz clic en cualquier artículo; te diremos por qué está ahí.",
        quote: "Anclé la zona de estar",
        quoteSuffix: " a la pared sur para dejar la ventana sin obstrucciones y crear un triángulo de conversación claro con el sillón.",
        attribution: "— Resumen del proyecto · Park Slope · salón",
        items: [
          { name: "Sofá de 3 plazas · sofa_3seat", quote: "\"Coloqué el sofá de 3 plazas contra la pared sur para mirar hacia la ventana y asentar la zona de estar.\"", color: "#7C5BFF" },
          { name: "Sillón · armchair", quote: "\"Añadí el sillón en un ángulo de 45° para suavizar el rectángulo y completar un triángulo de conversación.\"", color: "#E8855A" },
          { name: "Lámpara de pie · floor_lamp", quote: "\"Escondí la lámpara en la esquina NE — luz de tarea para el sillón sin amontonar la alfombra.\"", color: "#7B8C6F" },
        ]
      },
      styles: {
        tag: "5 estilos",
        title: "Cinco perfiles de diseño ajustados a mano.",
        lede: "Cada estilo está cuidadosamente elaborado por diseñadores de interiores profesionales para crear espacios hermosos y armoniosos. Desde el acogedor Nórdico hasta el elegante Minimalista, encuentra la vibra perfecta para tu hogar."
      },
      rooms: {
        tag: "4 tipos de habitación",
        title: "Salón, dormitorio, comedor, oficina.",
        lede: "Ya sea que estés rediseñando un dormitorio acogedor o una oficina productiva en casa, nuestra IA comprende el flujo de cada espacio para sugerir la ubicación perfecta de los muebles."
      },
      hierarchy: {
        tag: "Proyecto → Habitación → Diseño",
        title: "Organiza toda una casa.",
        lede: "Planifica todo tu hogar sin esfuerzo. Organiza diferentes habitaciones, guarda múltiples ideas de diseño para cada espacio y elige tus favoritos. Diseñar una casa completa nunca ha sido tan fácil.",
        project: "Proyecto",
        room: "Habitación",
        layout: "Diseño",
        projectName: "Apartamento Park Slope",
        room1Name: "Salón · 4×5m",
        room2Name: "Dormitorio · 3.5×4m",
        room3Name: "Comedor · 3.5×4.5m",
        room4Name: "Oficina en casa · 3×3m",
        layout1Name: "Luminoso + almacenaje",
        layout2Name: "Edición acogedora",
        layout3Name: "Más abierto",
        primary: "principal"
      },
      compare: {
        tag: "Comparador A/B",
        title: "Desliza para comparar dos variantes.",
        lede: "¿No puedes decidir entre dos estilos? Usa nuestro deslizador de comparación suave para ver fácilmente diferentes diseños en el mismo espacio exacto. Elegir tu opción ideal está a solo un deslizamiento de distancia."
      },
      share: {
        tag: "Compartir",
        title: "Envía un enlace. Sin necesidad de registrarse.",
        lede: "Cada diseño tiene una URL de compartición pública de solo lectura. El destinatario ve la misma escena 3D y el análisis que tú — sin cuenta y sin instalar nada. Revoque el acceso en cualquier momento."
      },
      theme: {
        tag: "Claro y oscuro",
        title: "Diseñado para ambos. Persistente por usuario.",
        lede: "Alterna en la barra superior; lo recordamos. Cada componente, paleta y entorno HDRI está adaptado para ambos temas."
      },
      templates: {
        tag: "Plantillas seleccionadas",
        title: "Comienza desde un espacio hermosamente diseñado.",
        lede: "Copia una plantilla entera directamente en tu espacio en tan solo un clic. Modifica el estilo o ajusta el diseño a tu antojo.",
        items: [
          { name: "Estudio soleado", meta: "Escandinavo · 28m²" },
          { name: "Loft Industrial", meta: "Industrial · 45m²" },
          { name: "Dormitorio Zen", meta: "Japandi · 18m²" },
        ]
      },
      trust: {
        tag: "Confianza",
        title: "Impulsado por IA. Verificado por diseñadores.",
        lede: "Probamos miles de diseños para asegurarnos que la IA respeta el espacio de movimiento y distancia standard ergonómica.",
        items: [
          { icon: "🔒", title: "Privacidad Total", text: "Tus diseños son completamente tuyos. Mantenemos tus proyectos seguros y privados, asegurando que nadie más vea tu casa ideal sin tu permiso." },
          { icon: "✨", title: "Acceso Instantáneo", text: "No se requieren cuentas para empezar a explorar. Prueba nuestras herramientas rápidamente y guarda tu progreso solo cuando estés listo." },
          { icon: "⚡", title: "Velocidad Rayo", text: "Disfruta de un renderizado fluido e instantáneo. Nuestra plataforma optimizada asegura que veas tus cambios en tiempo real." },
          { icon: "🔗", title: "Compartir Fácil", text: "Comparte tus hermosos diseños con amigos o familiares mediante un enlace simple. Tienes control total y puedes revocar el acceso cuando quieras." },
        ]
      },
      pricing: {
        tag: "Precios",
        title: "Generoso nivel gratuito. Profesional si lo necesitas.",
        lede: "Todo lo que necesitas para diseñar una casa es gratis. El plan Profesional desbloquea artículos del catálogo premium, exportaciones de mayor resolución y cola prioritaria.",
        freeName: "Gratis",
        freeAmount: "0€",
        freeSuffix: "para siempre",
        freeTagline: "Todo lo que necesitas para diseñar un hogar.",
        freeCTA: "Empieza gratis, sin registro",
        proName: "Profesional",
        proAmount: "12€",
        proSuffix: "/mes · beta gratis",
        proTagline: "Para personas que diseñan más de un hogar.",
        proCTA: "Únete a la lista de espera",
        comingSoon: "Próximamente",
        features: {
          gen10: "10 generaciones / día",
          unlimited: "Generaciones ilimitadas",
          allRooms: "Los 4 tipos de habitación y 5 estilos",
          saveUnlimited: "Guarda proyectos y diseños ilimitados",
          shareLinks: "Comparte enlaces de solo lectura",
          lightDark: "Modo claro + oscuro",
          premiumLocked: "Artículos premium del catálogo (~5/estilo)",
          premiumUnlocked: "Catálogo premium desbloqueado",
          hiRes: "Exportaciones en mayor resolución",
          priority: "Cola de generación prioritaria",
          earlyAccess: "Acceso anticipado a nuevos tipos de habitación",
          support: "Soporte por correo electrónico",
          allFree: "Todas las funciones gratuitas"
        }
      },
      final: {
        title: "Pruébalo gratis. Sin registro.",
        copy: "Tendrás un salón 3D por el que podrás orbitar en menos de 10 segundos. Si te gusta, guárdalo. Si no, cierra la pestaña.",
        cta: "Comenzar el asistente →"
      },
      waitlist: {
        tag: "Acceso Pro",
        title: "Únete a la lista de espera Pro",
        titleEm: "lista Pro",
        lede: "Sé el primero en desbloquear artículos premium, exportaciones en alta resolución y generación prioritaria por IA.",
        labelName: "Nombre completo",
        labelEmail: "Correo electrónico",
        labelInterest: "Tu interés",
        interestIndividual: "Uso personal / Propietario",
        interestDesigner: "Diseñador de interiores profesional",
        interestAgent: "Agente inmobiliario / Promotor",
        interestOther: "Otro",
        submit: "Unirse a la lista",
        submitting: "Asegurando tu lugar...",
        privacy: "🔒 Sin spam. Solo acceso anticipado.",
        successTitle: "Ya estás oficialmente en la lista.",
        successLede: "Hemos recibido tu solicitud. Atento a tu bandeja de entrada para tu invitación exclusiva.",
        successCTA: "Volver al sitio"
      },
      blog: {
        posts: [
          { eyebrow: "Ingeniería", title: "Por qué ejecutamos dos pases de LLM en lugar de uno", excerpt: "Cómo dividir la selección de zonas de la selección de artículos redujo nuestra tasa de alucinación a casi cero.", meta: "8 min · 24 Abr" },
          { eyebrow: "Diseño", title: "Un enum pequeño gana a la prosa libre siempre", excerpt: "Por qué nuestra IA elige de un vocabulario de slots cerrado y el servidor resuelve las coordenadas.", meta: "5 min · 11 Abr" },
          { eyebrow: "Catálogo", title: "Comprimiendo 40 GLBs en 8 megabytes", excerpt: "Nuestro pipeline gltfpack + KTX2 pipeline, end-to-end, con los números.", meta: "6 min · 28 Mar" },
        ]
      }
    },
    footer: {
      copy: "© 2026 Interior Flow 3D. Todos los derechos reservados.",
      tagline: "Diseño de interiores generado por IA que se siente intencional, explicable e instantáneamente visualizable.",
      product: "Producto",
      wizard: "Asistente",
      styles: "Estilos",
      rooms: "Habitaciones",
      pricing: "Precios",
      features: "Características",
      smartLayouts: "Diseños Inteligentes",
      easySwapping: "Intercambio Fácil",
      abCompare: "Comparación A/B",
      share: "Compartir",
      connect: "Conectar",
      repository: "Repositorio"
    }
  }
} as const;

export type Language = keyof typeof marketingTranslations;
