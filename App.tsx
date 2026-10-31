import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, StyleSheet, Switch, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

type Choice = { label: string; next: string; effect: string; trust?: number; clue?: string; item?: string };
type Scene = { title: string; body: string; choices: Choice[] };
type Story = {
  id: string; title: string; genre: string; world: string; hero: string; personality: string;
  scene: string; history: string[]; flags: string[]; updatedAt: number; finished?: boolean; characters?: CharacterProfile[];
  naraTrust: number; clues: string[]; inventory: string[]; characterMemories: Record<string, string[]>;
};
type CharacterProfile = { id:string; name:string; role:string; appearance:string; clothing:string; personality:string; speakingStyle:string; likes:string; goals:string; fears:string; backstory:string; secrets:string; illustrationPrompt:string; memories:string[] };
type Tab = "home" | "create" | "library" | "settings";

const STORE = "dreamworld.stories.v1";
const SETTINGS_STORE = "dreamworld.settings.v1";
const palettes = {
  dark: { bg:"#101321", panel:"#1B2033", panel2:"#252C43", text:"#F4F1FF", muted:"#A9AEC5", accent:"#B69CFF", border:"#343B56" },
  light: { bg:"#F4F2FA", panel:"#FFFFFF", panel2:"#EAE6F5", text:"#211D32", muted:"#6C6680", accent:"#7555C7", border:"#DDD7EB" }
};
const storyScenes: Record<string, Scene> = {
  start: { title:"Un comienzo inesperado", body:"El viento mueve las hojas mientras observas un lugar que no aparece en ningún mapa. Una luz tenue palpita entre los árboles. No recuerdas cómo has llegado, pero una voz tranquila pronuncia tu nombre desde el otro lado del sendero.", choices:[
    {label:"Acercarme a la luz", next:"shrine", effect:"Te has acercado a la misteriosa luz.", clue:"Has encontrado un santuario oculto."},
    {label:"Buscar un lugar elevado para orientarme", next:"hill", effect:"Has decidido observar el entorno antes de actuar."},
    {label:"Responder a la voz", next:"voice", effect:"Has respondido a la voz desconocida.", trust:1, clue:"La voz parece conocerte."}
  ]},
  shrine: { title:"El santuario oculto", body:"La luz procede de una pequeña piedra suspendida sobre un pedestal. Al acercarte, aparecen símbolos que parecen reaccionar a tu presencia. El aire vibra y una puerta dibujada en el tronco de un árbol comienza a brillar.", choices:[
    {label:"Tocar la piedra", next:"memory", effect:"Has tocado la piedra y despertado un recuerdo extraño.", item:"Fragmento de piedra", clue:"Una torre aparece en tu recuerdo."},
    {label:"Examinar los símbolos", next:"symbols", effect:"Has estudiado los símbolos del santuario.", clue:"Los símbolos señalan tres lugares."}
  ]},
  hill: { title:"Desde lo alto", body:"Subes por una colina y descubres un valle inmenso. A lo lejos hay una ciudad amurallada y, más cerca, una columna de humo. Por primera vez tienes una idea de dónde podrías estar.", choices:[
    {label:"Dirigirme hacia la ciudad", next:"city", effect:"Has elegido buscar refugio en la ciudad."},
    {label:"Investigar la columna de humo", next:"camp", effect:"Has decidido investigar el humo."}
  ]},
  voice: { title:"La voz entre los árboles", body:"—No tengas miedo —responde la voz—. Este mundo no te conoce todavía. Una figura encapuchada aparece a unos pasos, manteniendo una distancia prudente. Te ofrece explicarte lo ocurrido, pero espera a que decidas.", choices:[
    {label:"Escuchar su explicación", next:"guide", effect:"Has aceptado escuchar a la figura.", trust:2, clue:"La viajera se llama Nara."},
    {label:"Preguntar primero quién es", next:"identity", effect:"Has pedido saber quién es antes de confiar.", trust:1}
  ]},
  memory: { title:"Un recuerdo fragmentado", body:"Una imagen fugaz cruza tu mente: una torre bajo dos lunas y alguien prometiendo que volvería. No sabes si es un recuerdo tuyo o de otra persona. La piedra se apaga, pero ahora reconoces un símbolo grabado en tu mano.", choices:[
    {label:"Seguir el símbolo", next:"symbols", effect:"Has decidido seguir la pista del símbolo."},
    {label:"Buscar a alguien que pueda explicarlo", next:"city", effect:"Has decidido buscar respuestas en la ciudad."}
  ]},
  symbols: { title:"El lenguaje antiguo", body:"Los símbolos forman un mapa incompleto. Señalan tres lugares: una ciudad, un bosque profundo y una torre junto al mar. Una frase aparece al pie del mapa: «El camino cambia según quien lo recorre».", choices:[
    {label:"Ir a la ciudad", next:"city", effect:"Tu siguiente destino es la ciudad."},
    {label:"Adentrarme en el bosque", next:"camp", effect:"Has escogido explorar el bosque."}
  ]},
  city: { title:"Las puertas de Arvendel", body:"La ciudad está llena de puestos, viajeros y rumores. En una taberna anuncian que la antigua torre ha vuelto a emitir señales. Una cartógrafa parece reconocer el símbolo que llevas contigo.", choices:[
    {label:"Hablar con la cartógrafa", next:"cartographer", effect:"Has buscado ayuda de una cartógrafa."},
    {label:"Preguntar por la torre", next:"tower", effect:"Has preguntado por las señales de la torre."}
  ]},
  camp: { title:"El campamento abandonado", body:"Encuentras un campamento vacío. Hay una fogata apagada, un cuaderno y huellas que se internan en el bosque. El cuaderno contiene una nota: «No dejéis que la torre despierte»", choices:[
    {label:"Leer el cuaderno con atención", next:"notebook", effect:"Has estudiado la nota del campamento.", clue:"El cuaderno menciona una llave y a Nara."},
    {label:"Seguir las huellas", next:"forest", effect:"Has seguido las huellas hacia el bosque."}
  ]},
  guide: { title:"Una explicación pendiente", body:"La figura se presenta como Nara, una viajera que conoce los caminos entre mundos. Según ella, has llegado a un territorio que está perdiendo sus recuerdos. No puede decirte por qué has sido llamado, pero conoce a alguien en Arvendel.", choices:[
    {label:"Acompañar a Nara", next:"city", effect:"Has decidido viajar con Nara.", trust:2, clue:"Nara conoce un camino hacia Arvendel."},
    {label:"Pedir más detalles", next:"identity", effect:"Has pedido más información antes de continuar."}
  ]},
  identity: { title:"Una respuesta a medias", body:"—Me llamo Nara. También llegué aquí sin entenderlo —dice—. No espero que confíes en mí. Puedo mostrarte el camino a Arvendel; allí quizá encontremos respuestas.", choices:[
    {label:"Ir con Nara", next:"city", effect:"Has aceptado viajar con Nara.", trust:2},
    {label:"Continuar por mi cuenta", next:"hill", effect:"Has preferido seguir por tu cuenta.", trust:-1}
  ]},
  cartographer: { title:"La cartógrafa", body:"La cartógrafa se llama Elian. Reconoce el símbolo y te cuenta que aparece en mapas anteriores a la fundación de la ciudad. Te entrega una copia de un mapa y marca la torre costera.", choices:[
    {label:"Pedir que me acompañe", next:"tower", effect:"Has invitado a Elian a acompañarte."},
    {label:"Guardar el mapa y partir", next:"tower", effect:"Has guardado el mapa para tu viaje.", item:"Mapa de Elian", clue:"El mapa marca la torre costera."}
  ]},
  tower: { title:"La torre junto al mar", body:"Desde el acantilado ves una torre antigua rodeada de niebla. Una luz se enciende en su parte más alta. El símbolo de tu mano responde con un brillo suave. Parece que tu llegada y la torre están relacionadas.", choices:[
    {label:"Acercarme a la entrada", next:"towerDoor", effect:"Te has acercado a la entrada de la torre."},
    {label:"Observar desde lejos", next:"towerLook", effect:"Has preferido estudiar la torre antes de acercarte."}
  ]},
  notebook: { title:"La nota del cuaderno", body:"Las páginas describen una expedición que buscaba cerrar una grieta entre mundos. El último apunte menciona una llave escondida en la torre costera. El cuaderno termina con un nombre: Nara.", choices:[
    {label:"Buscar a Nara", next:"guide", effect:"Has decidido encontrar a Nara."},
    {label:"Ir directamente a la torre", next:"tower", effect:"Has decidido buscar la llave."}
  ]},
  forest: { title:"El sendero del bosque", body:"Las huellas llegan hasta un claro donde crecen flores luminosas. En el centro hay una brújula que no apunta al norte, sino hacia la costa. Al recogerla, escuchas un sonido lejano parecido a una campana.", choices:[
    {label:"Seguir la brújula", next:"tower", effect:"La brújula te guía hacia la torre.", item:"Brújula luminosa"},
    {label:"Regresar a Arvendel", next:"city", effect:"Has decidido volver a la ciudad."}
  ]},
  towerDoor: { title:"La puerta sellada", body:"La puerta no tiene cerradura. En su superficie hay un hueco con la misma forma que el símbolo de tu mano. Antes de actuar, notas tres pequeñas marcas alrededor del marco.", choices:[
    {label:"Apoyar la mano sobre el símbolo", next:"ending", effect:"Has activado el sello de la torre.", clue:"Has abierto el primer umbral."},
    {label:"Examinar las tres marcas", next:"towerLook", effect:"Has decidido estudiar el mecanismo."}
  ]},
  towerLook: { title:"El secreto de la torre", body:"Las marcas representan memoria, elección y vínculo. Comprendes que la puerta no busca una llave, sino una decisión consciente. La luz de la torre se vuelve más intensa.", choices:[
    {label:"Abrir la puerta", next:"ending", effect:"Has decidido abrir la puerta."},
    {label:"Volver a la ciudad para prepararme", next:"city", effect:"Has decidido prepararte antes de entrar."}
  ]},
  ending: { title:"El primer umbral", body:"El sello responde y la puerta se abre lentamente. Al otro lado no hay una habitación, sino un cielo distinto, atravesado por dos lunas. Una voz resuena desde la oscuridad: «Ahora que has elegido, la verdadera historia puede comenzar». Tu aventura acaba de abrirse.", choices:[
    {label:"Contemplar el nuevo mundo", next:"start", effect:"Has decidido comenzar un nuevo ciclo."}
  ]}
};

function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
function AppButton({label, onPress, secondary=false, disabled=false, colors}: any) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button,{backgroundColor:secondary?colors.panel2:colors.accent, opacity:disabled?0.5:1}]}><Text style={[styles.buttonText,{color:secondary?colors.text:"#171326"}]}>{label}</Text></Pressable>;
}
export default function App() {
  const [dark,setDark]=useState(true);
  const [tab,setTab]=useState<Tab>("home");
  const [stories,setStories]=useState<Story[]>([]);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [title,setTitle]=useState("Mi primera aventura");
  const [hero,setHero]=useState("Aventurero/a");
  const [world,setWorld]=useState("Fantasía");
  const [genre,setGenre]=useState("Aventura");
  const [personality,setPersonality]=useState("Curioso/a y decidido/a");
  const [loading,setLoading]=useState(true);
  const [autoCharacters,setAutoCharacters]=useState(true);
  const c=dark?palettes.dark:palettes.light;
  const active=stories.find(s=>s.id===activeId) || null;
  const scene=active?storyScenes[active.scene]:null;

  useEffect(()=>{ (async()=>{try{const raw=await AsyncStorage.getItem(STORE); if(raw) setStories((JSON.parse(raw) as Story[]).map(s=>({...s,characters:s.characters||[],characterMemories:s.characterMemories||{Nara:[]},clues:s.clues||[],inventory:s.inventory||[]}))); const settings=await AsyncStorage.getItem(SETTINGS_STORE); if(settings) setAutoCharacters(JSON.parse(settings).autoCharacters!==false);}catch(e){Alert.alert("Aviso","No se pudieron cargar las historias guardadas.");}finally{setLoading(false);}})(); },[]);
  useEffect(()=>{ if(!loading) AsyncStorage.setItem(STORE,JSON.stringify(stories)).catch(()=>Alert.alert("Aviso","No se pudo guardar el progreso.")); },[stories,loading]);
  useEffect(()=>{ if(!loading) AsyncStorage.setItem(SETTINGS_STORE,JSON.stringify({autoCharacters})).catch(()=>{}); },[autoCharacters,loading]);

  function createStory(){
    const s:Story={id:makeId(),title:title.trim()||"Nueva aventura",genre,world,hero:hero.trim()||"Protagonista",personality,scene:"start",history:["La aventura ha comenzado."],flags:[],updatedAt:Date.now(),naraTrust:0,clues:[],inventory:[],characterMemories:{Nara:[]},characters:[]};
    setStories(old=>[s,...old]); setActiveId(s.id); setTab("home");
  }
  function choose(choice:Choice){
    if(!active) return;
    const nextTrust = Math.max(-3, Math.min(5, active.naraTrust + (choice.trust || 0)));
    const newClues = choice.clue && !active.clues.includes(choice.clue) ? [...active.clues, choice.clue] : active.clues;
    const newItems = choice.item && !active.inventory.includes(choice.item) ? [...active.inventory, choice.item] : active.inventory;
    const memoryLine = choice.effect;
    const memories = { ...active.characterMemories, Nara: [...(active.characterMemories.Nara || []), ...(choice.trust ? [memoryLine] : [])] };
    let characters=active.characters||[];
    if(autoCharacters && ["guide","identity"].includes(choice.next) && !characters.some(ch=>ch.name==="Nara")){
      characters=[...characters,{id:"nara-"+active.id,name:"Nara",role:"Viajera entre mundos",appearance:"Joven viajera de expresión observadora, cabello oscuro y ojos violetas; lleva una pequeña marca luminosa en la muñeca.",clothing:"Capa de viaje azul noche, ropa cómoda de exploradora y una bolsa cruzada.",personality:"Prudente, curiosa y reservada al principio. Es leal cuando alguien se gana su confianza.",speakingStyle:"Habla con calma, elige bien sus palabras y a veces responde con misterio.",likes:"Los mapas antiguos, el té caliente y descubrir lugares olvidados.",goals:"Encontrar el origen de las grietas entre mundos.",fears:"Perder a las personas a las que decide ayudar.",backstory:"Llegó a este mundo antes que el protagonista y lleva tiempo buscando una forma de regresar.",secrets:"Conoce más sobre la torre de lo que está dispuesta a admitir.",illustrationPrompt:"Ilustración anime original de Nara, viajera de fantasía con capa azul noche, cabello oscuro, ojos violetas, bolsa de exploradora, bosque mágico al atardecer, diseño de personaje de cuerpo entero.",memories:[]}];
    }
    const updated={...active,scene:choice.next,history:[...active.history,choice.effect],naraTrust:nextTrust,clues:newClues,inventory:newItems,characterMemories:memories,characters,updatedAt:Date.now(),finished:choice.next==="ending"};
    setStories(old=>old.map(s=>s.id===active.id?updated:s));
  }
  function removeStory(id:string){Alert.alert("Eliminar historia","¿Seguro que quieres eliminar esta historia?",[{text:"Cancelar",style:"cancel"},{text:"Eliminar",style:"destructive",onPress:()=>{setStories(old=>old.filter(s=>s.id!==id));if(activeId===id)setActiveId(null);}}]);}
  function restartStory(){if(!active)return; Alert.alert("Reiniciar aventura","Se reiniciará la historia desde el principio. El registro anterior se conservará como recuerdo.",[{text:"Cancelar",style:"cancel"},{text:"Reiniciar",onPress:()=>setStories(old=>old.map(s=>s.id===active.id?{...s,scene:"start",history:[...s.history,"— La aventura se ha reiniciado —"],finished:false,updatedAt:Date.now()}:s))}]);}

  const inputStyle=[styles.input,{backgroundColor:c.panel2,color:c.text,borderColor:c.border}];
  const field=(label:string,value:string,set:(v:string)=>void,placeholder:string)=> <View style={styles.field}><Text style={[styles.label,{color:c.muted}]}>{label}</Text><TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={c.muted} style={inputStyle}/></View>;
  const chip=(value:string,selected:boolean,onPress:()=>void)=><Pressable key={value} onPress={onPress} style={[styles.chip,{backgroundColor:selected?c.accent:c.panel2,borderColor:c.border}]}><Text style={{color:selected?"#171326":c.text,fontWeight:"600"}}>{value}</Text></Pressable>;
  const nav=(key:Tab,label:string)=><Pressable onPress={()=>{setActiveId(null);setTab(key);}} style={[styles.navItem,{borderColor:tab===key?c.accent:"transparent"}]}><Text style={{color:tab===key?c.accent:c.muted,fontWeight:tab===key?"700":"500"}}>{label}</Text></Pressable>;

  return <SafeAreaView style={[styles.safe,{backgroundColor:c.bg}]}><StatusBar style={dark?"light":"dark"}/><View style={styles.header}><View><Text style={[styles.brand,{color:c.text}]}>DreamWorld <Text style={{color:c.accent}}>AI</Text></Text><Text style={{color:c.muted,fontSize:12}}>Tu historia, tus decisiones</Text></View><Text style={{color:c.muted,fontSize:12}}>v0.5 · Gratis</Text></View>
    <View style={[styles.nav,{borderColor:c.border}]}>{nav("home","Inicio")}{nav("create","Crear")}{nav("library","Biblioteca")}{nav("settings","Ajustes")}</View>
    {loading?<View style={styles.center}><ActivityIndicator color={c.accent}/><Text style={{color:c.muted,marginTop:10}}>Cargando tus historias…</Text></View>:
    <ScrollView contentContainerStyle={styles.content}>
      {tab==="home" && <>{active&&scene?<><Text style={[styles.eyebrow,{color:c.accent}]}>{active.world.toUpperCase()} · {active.genre.toUpperCase()}</Text><Text style={[styles.heading,{color:c.text}]}>{active.title}</Text><View style={[styles.card,{backgroundColor:c.panel,borderColor:c.border}]}><Text style={[styles.sceneTitle,{color:c.text}]}>{scene.title}</Text><Text style={[styles.body,{color:c.text}]}>{scene.body}{active.scene==="guide" && active.naraTrust>=2 ? "\\n\\nNara parece confiar más en ti: te habla con franqueza y comparte lo que sabe." : ""}{active.scene==="guide" && active.naraTrust<0 ? "\\n\\nNara nota tu desconfianza y se reserva algunos detalles." : ""}{active.scene==="towerDoor" && active.inventory.includes("Fragmento de piedra") ? "\\n\\nEl fragmento de piedra vibra al acercarlo al sello." : ""}</Text><View style={[styles.statusPanel,{backgroundColor:c.panel2,borderColor:c.border}]}>
  <Text style={[styles.label,{color:c.accent}]}>ESTADO DE LA AVENTURA</Text>
  <Text style={{color:c.text,fontSize:13}}>Confianza de Nara: {active.naraTrust}/5</Text>
  <Text style={{color:c.text,fontSize:13}}>Pistas descubiertas: {active.clues.length} · Objetos: {active.inventory.length}</Text>
  {active.clues.length>0?<Text style={{color:c.muted,fontSize:12,marginTop:5}}>Última pista: {active.clues[active.clues.length-1]}</Text>:null}
  {active.inventory.length>0?<Text style={{color:c.muted,fontSize:12,marginTop:4}}>Inventario: {active.inventory.join(", ")}</Text>:null}
</View><Text style={[styles.label,{color:c.muted,marginTop:20}]}>¿QUÉ HACES?</Text>{scene.choices.map((choice,i)=><Pressable key={i} onPress={()=>choose(choice)} style={[styles.choice,{backgroundColor:c.panel2,borderColor:c.border}]}><Text style={{color:c.text,fontWeight:"600"}}>{i+1}. {choice.label}</Text></Pressable>)}<Text style={[styles.small,{color:c.muted}]}>Protagonista: {active.hero} · {active.personality}</Text></View><View style={[styles.card,{backgroundColor:c.panel,borderColor:c.border}]}>
  <Text style={[styles.cardTitle,{color:c.text}]}>Memoria de personajes</Text>
  <Text style={{color:c.muted,fontSize:13,lineHeight:20}}>Nara recuerda {active.characterMemories.Nara?.length || 0} decisiones tuyas. {active.naraTrust>=2?"Tu relación empieza a ser de confianza.":active.naraTrust<0?"La relación está marcada por la desconfianza.":"Todavía estáis conociéndoos."}</Text>
  {(active.characterMemories.Nara||[]).slice(-3).map((m,i)=><Text key={i} style={{color:c.muted,fontSize:12,marginTop:4}}>• {m}</Text>)}
</View><Text style={[styles.label,{color:c.muted,marginTop:20}]}>REGISTRO DE ACONTECIMIENTOS</Text>{active.history.slice(-5).reverse().map((h,i)=><Text key={i} style={[styles.history,{color:c.muted}]}>• {h}</Text>)}<AppButton label="Volver al inicio" secondary onPress={()=>setActiveId(null)} colors={c}/><AppButton label="Reiniciar aventura" secondary onPress={restartStory} colors={c}/></>:<><Text style={[styles.eyebrow,{color:c.accent}]}>BIENVENIDO/A A TU UNIVERSO</Text><Text style={[styles.heading,{color:c.text}]}>¿Qué historia vamos a vivir hoy?</Text><Text style={[styles.body,{color:c.muted}]}>Crea un mundo, toma decisiones y construye una aventura que podrás continuar cuando quieras.</Text><AppButton label="＋ Crear una historia" onPress={()=>setTab("create")} colors={c}/><Text style={[styles.sectionTitle,{color:c.text}]}>Continuar aventura</Text>{stories.length===0?<View style={[styles.card,{backgroundColor:c.panel,borderColor:c.border}]}><Text style={{color:c.muted}}>Todavía no tienes historias. ¡Crea la primera!</Text></View>:stories.slice(0,3).map(s=><Pressable key={s.id} onPress={()=>setActiveId(s.id)} style={[styles.storyCard,{backgroundColor:c.panel,borderColor:c.border}]}><View style={{flex:1}}><Text style={[styles.cardTitle,{color:c.text}]}>{s.title}</Text><Text style={{color:c.muted,fontSize:12}}>{s.world} · {s.genre}</Text></View><Text style={{color:c.accent}}>Abrir ›</Text></Pressable>)}</>}</>}
      {tab==="create"&&<><Text style={[styles.eyebrow,{color:c.accent}]}>NUEVA AVENTURA</Text><Text style={[styles.heading,{color:c.text}]}>Diseña tu historia</Text>{field("Nombre de la historia",title,setTitle,"Ej. El reino de las dos lunas")}{field("Nombre del protagonista",hero,setHero,"¿Cómo se llama?")}<Text style={[styles.label,{color:c.muted}]}>TIPO DE MUNDO</Text><View style={styles.chips}>{["Fantasía","Isekai","Ciencia ficción","Misterio","Vida cotidiana"].map(x=>chip(x,world===x,()=>setWorld(x)))}</View><Text style={[styles.label,{color:c.muted,marginTop:14}]}>GÉNERO</Text><View style={styles.chips}>{["Aventura","Fantasía","Drama","Comedia","Misterio"].map(x=>chip(x,genre===x,()=>setGenre(x)))}</View>{field("Personalidad del protagonista",personality,setPersonality,"Ej. Valiente, prudente, bromista…")}<AppButton label="Comenzar aventura" onPress={createStory} colors={c}/><Text style={[styles.small,{color:c.muted}]}>Esta versión usa un motor narrativo local de demostración. No necesita internet ni tokens.</Text></>}
      {tab==="library"&&<><Text style={[styles.eyebrow,{color:c.accent}]}>TUS MUNDOS</Text><Text style={[styles.heading,{color:c.text}]}>Biblioteca</Text>{stories.length===0?<Text style={{color:c.muted}}>Tu biblioteca está vacía por ahora.</Text>:stories.map(s=><View key={s.id} style={[styles.storyCard,{backgroundColor:c.panel,borderColor:c.border}]}><Pressable style={{flex:1}} onPress={()=>{setActiveId(s.id);setTab("home");}}><Text style={[styles.cardTitle,{color:c.text}]}>{s.title}</Text><Text style={{color:c.muted,fontSize:12}}>{s.hero} · {s.world} · {s.history.length} acontecimientos</Text></Pressable><Pressable onPress={()=>removeStory(s.id)}><Text style={{color:"#E58B9A",padding:8}}>Eliminar</Text></Pressable></View>)}</>}
      {tab==="settings"&&<><Text style={[styles.eyebrow,{color:c.accent}]}>PERSONALIZACIÓN</Text><Text style={[styles.heading,{color:c.text}]}>Ajustes</Text><View style={[styles.setting,{backgroundColor:c.panel,borderColor:c.border}]}><View style={{flex:1}}><Text style={[styles.cardTitle,{color:c.text}]}>Tema oscuro</Text><Text style={{color:c.muted,fontSize:12}}>Cambia entre tema oscuro y claro</Text></View><Switch value={dark} onValueChange={setDark} trackColor={{true:c.accent,false:c.border}}/></View><View style={[styles.setting,{backgroundColor:c.panel,borderColor:c.border}]}><View style={{flex:1}}><Text style={[styles.cardTitle,{color:c.text}]}>Crear personajes automáticamente</Text><Text style={{color:c.muted,fontSize:12}}>Genera su ficha cuando aparecen en la historia</Text></View><Switch value={autoCharacters} onValueChange={setAutoCharacters} trackColor={{true:c.accent,false:c.border}}/></View><View style={[styles.card,{backgroundColor:c.panel,borderColor:c.border}]}><Text style={[styles.cardTitle,{color:c.text}]}>Privacidad y funcionamiento</Text><Text style={[styles.body,{color:c.muted,fontSize:14}]}>Tus historias se guardan localmente en este dispositivo. Esta versión no utiliza cuentas, anuncios, compras, tokens ni llamadas a servicios externos.</Text><Text style={[styles.body,{color:c.muted,fontSize:14}]}>La narración y las fichas automáticas de esta versión son demostraciones locales. La personalidad se crea mediante una plantilla narrativa; todavía no hay un modelo de IA ni un generador de ilustraciones conectado. La descripción visual queda preparada para una futura integración gratuita, sin prometer generación ilimitada.</Text></View></>}
    </ScrollView>}
  </SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1},header:{paddingHorizontal:20,paddingTop:12,paddingBottom:14,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},brand:{fontSize:24,fontWeight:"900",letterSpacing:-0.7},nav:{flexDirection:"row",justifyContent:"space-around",borderBottomWidth:1,paddingBottom:10},navItem:{paddingHorizontal:8,paddingVertical:8,borderBottomWidth:2},content:{padding:20,paddingBottom:44},center:{flex:1,alignItems:"center",justifyContent:"center"},eyebrow:{fontSize:11,fontWeight:"800",letterSpacing:1.4,marginBottom:8},heading:{fontSize:29,fontWeight:"900",letterSpacing:-0.8,marginBottom:12},sectionTitle:{fontSize:18,fontWeight:"800",marginTop:28,marginBottom:12},body:{fontSize:16,lineHeight:25,marginBottom:18},button:{padding:16,borderRadius:14,alignItems:"center",marginTop:12},buttonText:{fontSize:15,fontWeight:"800"},card:{padding:18,borderRadius:18,borderWidth:1,marginTop:14},sceneTitle:{fontSize:21,fontWeight:"800",marginBottom:12},choice:{padding:15,borderRadius:13,borderWidth:1,marginTop:10},small:{fontSize:12,lineHeight:18,marginTop:16},label:{fontSize:11,fontWeight:"800",letterSpacing:1,marginBottom:8},history:{fontSize:13,lineHeight:20,marginTop:5},storyCard:{padding:16,borderRadius:15,borderWidth:1,marginTop:10,flexDirection:"row",alignItems:"center"},cardTitle:{fontSize:16,fontWeight:"800",marginBottom:5},field:{marginTop:14},input:{borderWidth:1,borderRadius:12,padding:13,fontSize:15,marginTop:6},chips:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:4},chip:{paddingHorizontal:12,paddingVertical:10,borderRadius:20,borderWidth:1},setting:{padding:16,borderRadius:15,borderWidth:1,marginTop:12,flexDirection:"row",alignItems:"center"},statusPanel:{padding:14,borderRadius:13,borderWidth:1,marginTop:8}
});
