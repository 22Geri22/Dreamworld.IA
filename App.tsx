import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system/legacy";
import { encode } from "base64-arraybuffer";

type Message = {
  id: string;
  role: "narrator" | "user" | "character";
  name?: string;
  text: string;
  imageUri?: string;
};

type Character = {
  id: string;
  name: string;
  personality: string;
  appearance: string;
  backstory: string;
  relationship: string;
  portraitUri?: string;
};

type Story = {
  id: string;
  title: string;
  hero: string;
  world: string;
  premise: string;
  messages: Message[];
  memories: string[];
  characters: Character[];
  createdAt: number;
  backgroundUri?: string;
  characterImages?: Record<string, string>;
};

const STORE = "dreamworld.stories.v2";
const API_URL = "https://dreamworld-ai.gerisanven.workers.dev";
const uid = () => Date.now().toString() + Math.random().toString(36).slice(2, 7);
const generateAndSaveImage = async (prompt: string) => {
  const response = await fetch(`${API_URL}/api/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error("No se ha podido generar la ilustración.");
  }

  const imageBuffer = await response.arrayBuffer();
  const base64 = encode(imageBuffer);

  if (!FileSystem.documentDirectory) {
    throw new Error("No se encuentra el almacenamiento de la aplicación.");
  }

  const imageUri = `${FileSystem.documentDirectory}dreamworld-${uid()}.jpg`;

  await FileSystem.writeAsStringAsync(
    imageUri,
    base64,
    { encoding: FileSystem.EncodingType.Base64 }
  );

  return imageUri;
};

function localReply(action: string, story: Story): string {
  const a = action.toLowerCase();
  const memoryLine = story.memories.length ? "Recuerdas lo que ya ha ocurrido: " + story.memories.slice(-3).join("; ") + ". " : "";
  if (/hola|buenas|saludos|quién eres|quien eres/.test(a)) return "La figura te observa con curiosidad. «Me llaman Nara. No esperaba encontrar a alguien como tú en este lugar». " + memoryLine + "Su tono es prudente, aunque no parece hostil.";
  if (/atacar|golpear|pelear|luchar|espada/.test(a)) return "Tu movimiento rompe la quietud del lugar. Nara retrocede para mantener la distancia y evalúa la situación. El ambiente se vuelve tenso; todavía hay margen para decidir cómo continúa.";
  if (/magia|hechizo|poder|conjuro/.test(a)) return "Al concentrarte, notas un cosquilleo en las manos. Un tenue resplandor aparece durante un instante y desaparece. Nara abre los ojos con sorpresa: «Eso no es magia corriente. Tendremos que averiguar de dónde viene».";
  if (/mirar|observar|examinar|buscar|investigar/.test(a)) return "Te tomas un momento para observar los alrededores. Entre los detalles que antes pasaban desapercibidos descubres marcas antiguas junto al camino y unas huellas que se alejan hacia el bosque. Nara espera a conocer tu conclusión.";
  if (/ir|caminar|avanzar|seguir|entrar|acerc/.test(a)) return "Decides avanzar. El paisaje cambia poco a poco y el sendero se abre ante ti. Nara camina a cierta distancia, atenta a cualquier señal. " + memoryLine + "El siguiente paso dependerá de lo que hagas al llegar.";
  if (/esperar|descansar|sentar/.test(a)) return "Decides no precipitarte. El tiempo pasa y el entorno se vuelve más silencioso. Nara aprovecha la pausa para observar el horizonte. «A veces esperar también es elegir», comenta.";
  if (/preguntar|por qué|porque|cómo|como|dónde|donde/.test(a)) return "Nara piensa unos segundos antes de contestar. «No conozco todas las respuestas. Pero puedo contarte lo que he visto y ayudarte a encontrar las que faltan». Su expresión indica que hay algo más que todavía no se atreve a explicar.";
  return "Tu decisión cambia el curso del momento. Nara escucha con atención y adapta su actitud a lo que acabas de hacer. El viento mueve las hojas, se oyen voces lejanas y aparece una nueva posibilidad ante ti. ¿Qué decides hacer ahora?";
}

export default function App() {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("Las dos lunas de Arvendel");
  const [hero, setHero] = useState("");
  const [world, setWorld] = useState("Isekai de fantasía");
  const [premise, setPremise] = useState("Despiertas en un mundo desconocido donde una torre antigua ha comenzado a emitir una señal.");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
const [generating, setGenerating] = useState(false);
  const active = stories.find(s => s.id === activeId) || null;
  useEffect(() => { (async () => { try { const raw = await AsyncStorage.getItem(STORE); if (raw) setStories(JSON.parse(raw)); } catch {} finally { setLoading(false); } })(); }, []);
  useEffect(() => { if (!loading) AsyncStorage.setItem(STORE, JSON.stringify(stories)).catch(() => {}); }, [stories, loading]);
const createStory = () => {
  if (!title.trim()) return;

  const s: Story = {
    id: uid(),
    title: title.trim(),
    hero: hero.trim() || "Protagonista",
    world,
    premise,
    messages: [
      {
        id: uid(),
        role: "narrator",
        text: premise.trim() || "Despiertas en un mundo desconocido. Tu aventura está a punto de comenzar.",
      },
    ],
    memories: [],
      characters: [],
    createdAt: Date.now(),
  };

  setStories(prev => [s, ...prev]);
  setActiveId(s.id);
  setDraft("");
};

  const send = async () => {
  if (!active || !draft.trim() || generating) return;

  const text = draft.trim();
  const storyId = active.id;

  const userMessage: Message = {
    id: uid(),
    role: "user",
    text,
  };

  const updatedMessages = [...active.messages, userMessage];

  setStories(prev =>
    prev.map(s =>
      s.id === storyId
        ? {
            ...s,
            messages: updatedMessages,
            memories: [...s.memories, text].slice(-30),
          }
        : s
    )
  );

  setDraft("");
  setGenerating(true);

  try {
    const context = [
      `Título: ${active.title}`,
      `Mundo: ${active.world}`,
      `Protagonista: ${active.hero}`,
      `Idea inicial: ${active.premise}`,
      "Acontecimientos recientes:",
      ...updatedMessages.slice(-12).map(m =>
        `${m.role === "user" ? active.hero : m.name || "Narrador"}: ${m.text}`
      ),
      "Personajes conocidos:",
      ...(active.characters || []).map(c =>
        "Nombre: " + c.name +
        ". Personalidad: " + c.personality +
        ". Apariencia: " + c.appearance +
        ". Pasado: " + c.backstory +
        ". Relación: " + c.relationship
      ),
      "Recuerdos importantes:",
      ...active.memories.slice(-20),
    ].join("\n");

    const response = await fetch(`${API_URL}/api/story`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        story: context,
        action: text,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.text) {
      throw new Error(data.detail || data.error || "La IA no ha devuelto una respuesta.");
    }

let imageUri: string | undefined;

try {
  imageUri = await generateAndSaveImage(
    `Anime fantasy illustration, scene from this story.
     World: ${active.world}.
     Story context: ${context.slice(-1500)}.
     Current scene: ${data.text.slice(0, 1500)}.
     Beautiful detailed environment, cinematic composition,
     consistent visual style, no text, no letters.`
  );
} catch (imageError) {
  console.log("No se pudo generar la ilustración:", imageError);
}

const newCharacters: Character[] = [];
    const knownNames = new Set(
      (active.characters || []).map(c => c.name.toLowerCase())
    );

    if (Array.isArray(data.characters)) {
      for (const item of data.characters) {
        const name = String(item.name || "Personaje nuevo").trim();
        if (!name || knownNames.has(name.toLowerCase())) continue;

        knownNames.add(name.toLowerCase());

        let portraitUri: string | undefined;
        try {
          portraitUri = await generateAndSaveImage(
            "Anime character portrait, consistent visual design. " +
            "Name: " + name + ". Appearance: " +
            String(item.appearance || "Fantasy anime character") +
            ". Personality: " + String(item.personality || "") +
            ". Solo character, detailed portrait, no text."
          );
        } catch (error) {
          console.log("No se pudo generar el retrato de " + name, error);
        }

        newCharacters.push({
          id: uid(),
          name,
          personality: String(item.personality || ""),
          appearance: String(item.appearance || ""),
          backstory: String(item.backstory || ""),
          relationship: String(item.relationship || ""),
          portraitUri,
        });
      }
    }

    const aiMessage: Message = {
  id: uid(),
  role: "narrator",
  text: data.text,
  imageUri,
};

    setStories(prev =>
      prev.map(s =>
        s.id === storyId
          ? { ...s, messages: [...s.messages, aiMessage], characters: [...(s.characters || []), ...newCharacters] }
          : s
      )
    );
  } catch (error) {
    const errorMessage: Message = {
      id: uid(),
      role: "narrator",
      text: "No he podido conectar con la IA. Comprueba tu conexión e inténtalo de nuevo. " +
        String(error),
    };

    setStories(prev =>
      prev.map(s =>
        s.id === storyId
          ? { ...s, messages: [...s.messages, errorMessage] }
          : s
      )
    );
  } finally {
    setGenerating(false);
  }
};

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color="#B69CFF" /></SafeAreaView>;
  return <SafeAreaView style={styles.safe}><StatusBar style="light" />
    <View style={styles.header}><Pressable onPress={() => setActiveId(null)}><Text style={styles.brand}>✦ DreamWorld AI</Text></Pressable><Text style={styles.version}>v0.6 · prototipo</Text></View>
    {active ? <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
      <View style={styles.storyHead}><Text style={styles.kicker}>{active.world.toUpperCase()}</Text><Text style={styles.heading}>{active.title}</Text><Text style={styles.sub}>Protagonista: {active.hero} · Nara está presente</Text></View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.chat}>{active.messages.map(m => <View key={m.id} style={[styles.bubble, m.role === "user" ? styles.userBubble : m.role === "character" ? styles.characterBubble : styles.narratorBubble]}>{m.role !== "user" && <Text style={styles.speaker}>{m.role === "character" ? (m.name || "Personaje") : "NARRADOR"}</Text>}{m.imageUri ? <Image source={{ uri: m.imageUri }} style={{ width: "100%", height: 230, borderRadius: 12, marginBottom: 12 }} resizeMode="cover" /> : null}<Text style={styles.message}>{m.text}</Text></View>)}<Text style={styles.memoryNote}>Memoria local: {active.memories.length} acciones recordadas en esta historia.</Text></ScrollView>
      <View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} placeholder="Escribe lo que quieras hacer o decir…" placeholderTextColor="#8D91A8" multiline style={styles.input} /><Pressable onPress={send} style={[styles.send, !draft.trim() && styles.disabled]}><Text style={styles.sendText}>Enviar</Text></Pressable></View>
      <Pressable onPress={() => setActiveId(null)} style={styles.back}><Text style={styles.backText}>‹ Biblioteca</Text></Pressable>
    </KeyboardAvoidingView> : <ScrollView contentContainerStyle={styles.content}><Text style={styles.kicker}>TU AVENTURA, TUS DECISIONES</Text><Text style={styles.heading}>Crea un mundo y escribe libremente.</Text><Text style={styles.description}>Esta versión incorpora escritura libre y un registro de acciones. Las respuestas narrativas todavía funcionan con reglas locales: aún no están conectadas a un modelo de IA.</Text>
      <Text style={styles.section}>Nueva historia</Text><Text style={styles.label}>TÍTULO</Text><TextInput value={title} onChangeText={setTitle} style={styles.formInput} placeholder="Nombre de la historia" placeholderTextColor="#8D91A8" /><Text style={styles.label}>PROTAGONISTA</Text><TextInput value={hero} onChangeText={setHero} style={styles.formInput} placeholder="Tu nombre o el de tu personaje" placeholderTextColor="#8D91A8" /><Text style={styles.label}>MUNDO</Text><TextInput value={world} onChangeText={setWorld} style={styles.formInput} placeholder="Isekai, fantasía, ciencia ficción…" placeholderTextColor="#8D91A8" /><Text style={styles.label}>IDEA INICIAL</Text><TextInput value={premise} onChangeText={setPremise} multiline style={[styles.formInput, styles.multi]} placeholder="Describe el comienzo…" placeholderTextColor="#8D91A8" /><Pressable onPress={createStory} style={styles.primary}><Text style={styles.primaryText}>＋ Comenzar historia</Text></Pressable>
      <Text style={styles.section}>Tus historias</Text>{stories.length === 0 ? <Text style={styles.empty}>Todavía no tienes historias guardadas.</Text> : stories.map(s => <View key={s.id} style={styles.storyRow}><Pressable style={styles.storyOpen} onPress={() => setActiveId(s.id)}><Text style={styles.storyTitle}>{s.title}</Text><Text style={styles.storyMeta}>{s.world} · {s.messages.length} mensajes</Text></Pressable><Pressable onPress={() => setStories(prev => prev.filter(x => x.id !== s.id))}><Text style={styles.delete}>Eliminar</Text></Pressable></View>)}<Text style={styles.footer}>Las historias se guardan en este dispositivo. No hay compras ni tokens en este prototipo.</Text>
    </ScrollView>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:"#101321"},flex:{flex:1},header:{paddingHorizontal:18,paddingVertical:14,borderBottomWidth:1,borderBottomColor:"#343B56",flexDirection:"row",alignItems:"center",justifyContent:"space-between"},brand:{color:"#F4F1FF",fontSize:21,fontWeight:"900"},version:{color:"#A9AEC5",fontSize:11},content:{padding:20,paddingBottom:44},kicker:{color:"#B69CFF",fontSize:11,fontWeight:"800",letterSpacing:1.4,marginBottom:8},heading:{color:"#F4F1FF",fontSize:27,fontWeight:"900",marginBottom:9},description:{color:"#B7B9CC",fontSize:14,lineHeight:21,marginBottom:16},section:{color:"#F4F1FF",fontSize:18,fontWeight:"800",marginTop:18,marginBottom:12},label:{color:"#B69CFF",fontSize:10,fontWeight:"800",letterSpacing:1,marginTop:12,marginBottom:5},formInput:{backgroundColor:"#1B2033",color:"#F4F1FF",borderColor:"#343B56",borderWidth:1,borderRadius:12,padding:13,fontSize:14},multi:{minHeight:82,textAlignVertical:"top"},primary:{backgroundColor:"#8F72D8",padding:15,borderRadius:13,alignItems:"center",marginTop:16},primaryText:{color:"#FFFFFF",fontWeight:"800",fontSize:15},empty:{color:"#A9AEC5",fontSize:13},storyRow:{backgroundColor:"#1B2033",borderWidth:1,borderColor:"#343B56",borderRadius:13,padding:14,marginTop:9,flexDirection:"row",alignItems:"center"},storyOpen:{flex:1},storyTitle:{color:"#F4F1FF",fontSize:15,fontWeight:"800"},storyMeta:{color:"#A9AEC5",fontSize:11,marginTop:4},delete:{color:"#E58B9A",padding:8,fontSize:12},footer:{color:"#8D91A8",fontSize:11,lineHeight:17,marginTop:22},storyHead:{paddingHorizontal:18,paddingTop:16,paddingBottom:8},sub:{color:"#A9AEC5",fontSize:12},chat:{padding:16,paddingBottom:24},bubble:{padding:14,borderRadius:15,marginBottom:11,maxWidth:"94%"},narratorBubble:{backgroundColor:"#1B2033",alignSelf:"stretch",borderWidth:1,borderColor:"#343B56"},characterBubble:{backgroundColor:"#29213F",alignSelf:"flex-start",borderWidth:1,borderColor:"#59467D"},userBubble:{backgroundColor:"#55427F",alignSelf:"flex-end"},speaker:{color:"#C9B7FF",fontSize:9,fontWeight:"900",letterSpacing:1,marginBottom:6},message:{color:"#F4F1FF",fontSize:15,lineHeight:22},memoryNote:{color:"#8D91A8",fontSize:10,textAlign:"center",marginTop:8},composer:{flexDirection:"row",alignItems:"flex-end",gap:8,padding:12,borderTopWidth:1,borderTopColor:"#343B56",backgroundColor:"#151A2B"},input:{flex:1,maxHeight:110,minHeight:46,backgroundColor:"#252C43",borderRadius:13,paddingHorizontal:13,paddingVertical:11,color:"#F4F1FF",fontSize:14,textAlignVertical:"top"},send:{backgroundColor:"#8F72D8",paddingHorizontal:16,paddingVertical:14,borderRadius:12},sendText:{color:"#FFFFFF",fontWeight:"800"},disabled:{opacity:0.45},back:{padding:12,alignItems:"center"},backText:{color:"#B69CFF",fontWeight:"700"} });
