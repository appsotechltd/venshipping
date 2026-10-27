
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenAI, FunctionDeclaration, Type, Modality, LiveServerMessage, Blob as GenAI_Blob } from '@google/genai';
import { ChatBubbleIcon, CloseIcon, SendIcon, MicrophoneIcon, WaveIcon } from './icons';

interface Message {
  id: number;
  sender: 'user' | 'bot' | 'system';
  text?: string;
  component?: React.ReactNode;
}

type ChatState = 'bot' | 'escalating' | 'live_chat' | 'form';
type VoiceStatus = 'off' | 'connecting' | 'listening' | 'processing' | 'speaking';

// --- Gemini Configuration ---
const systemInstruction = `You are a friendly and professional customer support assistant for Ven International Logistics Ltd.
Your knowledge is STRICTLY limited to the information provided below. Do NOT invent information or answer questions outside of this scope.
If a user asks for a price, cost, or quote, you MUST use the 'requestQuote' function.
If a user has a specific problem with their shipment (e.g., damaged goods, lost package) or asks to track a specific package ID, you MUST use the 'requestHumanSupport' function.

--- RESPONSE FORMATTING ---
- Use simple Markdown for clarity.
- For lists, start each item on a new line with a hyphen (e.g., "- First item").
- For emphasis, enclose words in single asterisks (e.g., "This is *very important*.").
- Keep responses concise and easy to read.

--- COMPANY INFORMATION ---
- Name: Ven International Logistics Ltd.
- Website: https://venshipping.com
- Email: support@venshipping.com
- WhatsApp/Call: 08143919153
- Address: NIGERIA WAREHOUSE, No:3 Clifford Amuche close, Ajao estate, around Eleganza.

--- DETAILED SERVICES ---
- Air Cargo: Ideal for urgent, high-value, or perishable goods. It is our fastest shipping option, with typical transit times of 5-10 days.
- Sea Shipping: The most cost-effective option for large, heavy, or non-urgent shipments. Transit time is longer, typically 30-45 days. We offer FCL, HCL, and Groupage options.
- Custom Clearance: We handle all necessary import and export paperwork, duties, and taxes in both China and Nigeria to ensure a smooth, hassle-free process.
- Export to China: We provide seamless export solutions from Nigeria to the Chinese market.
- Exchange of RMB: We offer competitive exchange rates for converting Nigerian Naira (NGN) to Chinese Yuan (RMB) to facilitate your business transactions.

--- SHIPPING TYPES (China 🇨🇳 to Nigeria 🇳🇬) ---
- Full Container Load (FCL): You book an entire container for your exclusive use, offering maximum security and space.
- Half Container Load (HCL): A dedicated half container space for your goods.
- Groupage Shipping (or LCL - Less than Container Load): You pay only for the space your goods occupy within a shared container. This is a very cost-effective option for smaller shipments.
- Express Shipping: Our fastest service, combining air freight with expedited customs and delivery.

--- OUR SHIPPING PROCESS ---
1.  Request a Quote: Contact us with your shipment details (item type, weight, dimensions).
2.  Booking: Once you accept the quote, we book your shipment.
3.  Pickup & Warehousing: We can arrange pickup from your supplier in China and consolidate items in our warehouse.
4.  Shipping: Your goods are shipped via your chosen method (air or sea).
5.  Customs Clearance: Our team handles all customs procedures.
6.  Delivery: After clearance, your shipment is delivered to your address in Nigeria.

--- FREQUENTLY ASKED QUESTIONS (FAQ) ---
- Q: How long does shipping take?
  - A: Air cargo typically takes 5-10 days. Sea shipping usually takes 30-45 days. These are estimates and can vary.
- Q: How is shipping cost calculated?
  - A: The cost depends on the mode of transport (air or sea), the shipment's weight and volume (volumetric weight), origin, and destination. For an accurate price, you must request a quote.
- Q: What kind of items can I ship?
  - A: We ship a wide range of items, including electronics, machinery, fashion apparel, auto parts, and general goods. We do not handle prohibited or dangerous goods.
- Q: Do you provide door-to-door service?
  - A: Yes, we offer comprehensive door-to-door service, managing the entire process from pickup in China to final delivery in Nigeria.

--- YOUR ROLE ---
Your role is to answer general questions based ONLY on the information above. Be helpful, but do not go beyond your instructions. Always use the specified formatting.
- Use 'requestQuote' for any pricing questions. Examples: "How much to ship a car?", "What's the cost for 50kg by air?", "Can I get a quote?".
- Use 'requestHumanSupport' for specific problems. Examples: "Where is my package VEN123?", "My items arrived damaged.", "I need to speak to someone about my shipment."`;

const requestHumanSupport: FunctionDeclaration = {
  name: 'requestHumanSupport',
  parameters: {
    type: Type.OBJECT,
    description: 'Use this function when the user needs help from a human agent for a specific problem like a damaged shipment, a lost package, or a specific tracking ID inquiry.',
    properties: {},
    required: [],
  },
};

const requestQuote: FunctionDeclaration = {
  name: 'requestQuote',
  parameters: {
    type: Type.OBJECT,
    description: "Use this function when the user asks for a price, cost, or a quote for shipping.",
    properties: {},
    required: [],
  },
};


// --- Audio Helper Functions ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): GenAI_Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const FormattedBotResponse: React.FC<{ text: string }> = ({ text }) => {
  // This is a simple markdown-like renderer for bot responses.
  const renderLineContent = (line: string) => {
    const parts = line.split(/(\*[^*]+\*)/g); // Split by *word*
    return (
      <>
        {parts.map((part, i) =>
          part.startsWith('*') && part.endsWith('*')
            ? <strong key={i}>{part.slice(1, -1)}</strong>
            : part
        )}
      </>
    );
  };

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 pl-2">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('- ')) {
      currentListItems.push(
        <li key={index}>
          {renderLineContent(trimmedLine.substring(2))}
        </li>
      );
    } else {
      flushList();
      if (trimmedLine) {
        elements.push(
          <p key={index} className="my-1">
            {renderLineContent(trimmedLine)}
          </p>
        );
      }
    }
  });

  flushList();

  return <div className="formatted-response">{elements}</div>;
};


export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'bot', text: "Hello! How can I help you with Ven Logistics services today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatState, setChatState] = useState<ChatState>('bot');
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // --- Voice Mode State ---
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('off');

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const silenceTimerRef = useRef<number | null>(null);
  const isUserSpeakingRef = useRef(false);
  const currentTurnUserMessageIdRef = useRef<number | null>(null);
  const currentTurnBotMessageIdRef = useRef<number | null>(null);

  const chatBodyRef = useRef<HTMLDivElement>(null);

  const ai = useMemo(() => {
    if (!process.env.API_KEY) {
      console.warn("API_KEY is missing. Chatbot may not function.");
      return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, voiceStatus]);

  const addMessage = (sender: 'user' | 'bot' | 'system', text: string) => {
    setMessages(prev => [...prev, { id: Date.now(), sender, text }]);
  };

  const handleQuoteRequest = (responseText?: string) => {
    const defaultText = "Certainly! To give you the most accurate price, please provide some details on our quote form. You can get started by clicking the button below.";
    const textToShow = responseText && responseText.trim() ? responseText : defaultText;

    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'bot',
      text: textToShow,
      component: (
        <div className="mt-2">
          <Link to="/quote" onClick={() => setIsOpen(false)} className="inline-block px-4 py-2 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-colors">
            Book a Shipping
          </Link>
        </div>
      )
    }]);
    setIsLoading(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    if (!ai) {
      addMessage('system', "Error: AI Service not initialized. Missing API Key.");
      return;
    }

    addMessage('user', text);
    setInputValue('');
    setIsLoading(true);

    try {
      const geminiHistory = messages
        .filter(msg => (msg.sender === 'user' || msg.sender === 'bot') && msg.text)
        .map(msg => ({
          role: (msg.sender === 'bot' ? 'model' : 'user') as 'model' | 'user',
          parts: [{ text: msg.text as string }]
        }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [...geminiHistory, { role: 'user', parts: [{ text }] }],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [requestHumanSupport, requestQuote] }],
        },
      });

      const functionCall = response.functionCalls?.[0];
      const botText = response.text;

      if (functionCall?.name === 'requestQuote') {
        handleQuoteRequest(botText);
      } else if (functionCall?.name === 'requestHumanSupport') {
        handleEscalation();
      } else {
        const quoteKeywords = ['quote', 'cost', 'price', 'pricing', 'rate'];
        const hasQuoteKeywords = botText && quoteKeywords.some(keyword => botText.toLowerCase().includes(keyword));

        if (hasQuoteKeywords) {
          handleQuoteRequest(botText);
        } else {
          if (botText && botText.trim()) {
            addMessage('bot', botText);
          }
          setIsLoading(false);
        }
      }

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      addMessage('bot', "I'm sorry, I'm having trouble connecting right now. Please try again later.");
      setIsLoading(false);
    }
  };

  const handleEscalation = () => {
    setChatState('escalating');
    addMessage('system', "Let me connect you with a support agent. For immediate assistance, you can also call us directly at 08143919153.");
    setIsLoading(false);
    setTimeout(() => {
      const isAgentAvailable = Math.random() > 0.5;
      if (isAgentAvailable) {
        setChatState('live_chat');
        addMessage('system', "An agent has joined the chat. Please wait for them to respond.");
      } else {
        setChatState('form');
        addMessage('system', "It seems all our agents are busy right now. Please leave your details below, and we'll get back to you via email.");
      }
    }, 2000);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    setFormStatus('sending');
    console.log('--- Support Form Submission ---');
    console.log('Recipient: support@venshipping.com');
    console.log('Data:', data);
    console.log('------------------------------');

    setTimeout(() => {
      setFormStatus('sent');
    }, 1500);
  };

  // --- Voice Session Logic ---
  const stopVoiceSession = useCallback(async () => {
    console.log("Stopping voice session...");
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect script processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
      scriptProcessorRef.current = null;
    }

    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }

    // Close audio contexts
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      // Stop any playing audio
      for (const source of audioSourcesRef.current.values()) {
        try { source.stop(); } catch (e) { }
      }
      audioSourcesRef.current.clear();
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Capture the promise before clearing the ref
    const currentPromise = sessionPromiseRef.current;
    sessionPromiseRef.current = null;

    if (currentPromise) {
      try {
        const session = await currentPromise;
        // IMPORTANT: Wrapping session.close in a try/catch to suppress the "ReadableStreamDefaultController" error
        // which occurs if the stream is already in the process of closing or errored out.
        try {
          await session.close();
        } catch (closeError: any) {
          // Ignore "ReadableStreamDefaultController" errors specifically, as they are noise.
          if (closeError?.message?.includes('ReadableStreamDefaultController')) {
            console.debug('Ignored expected stream close error.');
          } else {
            console.warn('Session close error:', closeError);
          }
        }
      } catch (e) {
        console.debug("Session promise resolution failed during close (expected if connect failed).", e);
      }
    }

    currentTurnUserMessageIdRef.current = null;
    currentTurnBotMessageIdRef.current = null;
    setVoiceStatus('off');
  }, []);


  const startVoiceSession = useCallback(async () => {
    if (!ai) {
      addMessage('system', "Voice mode unavailable: Missing API Key.");
      setIsVoiceMode(false);
      return;
    }

    addMessage('system', 'Connecting voice mode...');

    const VOICE_THRESHOLD = 0.01;
    const SILENCE_DELAY = 1000;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Using a local variable for the session promise to avoid state updates in the closure if possible
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Live session opened.');
            setVoiceStatus('listening');
            addMessage('system', 'Voice mode connected. Start speaking.');

            if (!inputAudioContextRef.current) return;

            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              // Only process if we still have an active session ref
              if (!sessionPromiseRef.current) return;

              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);

              if (rms > VOICE_THRESHOLD) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                isUserSpeakingRef.current = true;
              } else if (isUserSpeakingRef.current) {
                if (!silenceTimerRef.current) {
                  silenceTimerRef.current = window.setTimeout(() => {
                    isUserSpeakingRef.current = false;
                    setVoiceStatus(currentStatus => {
                      if (currentStatus === 'listening') return 'processing';
                      return currentStatus;
                    });
                    silenceTimerRef.current = null;
                  }, SILENCE_DELAY);
                }
              }

              const pcmBlob = createBlob(inputData);

              // Use the local sessionPromise to ensure we are using the one we created
              sessionPromise.then((session) => {
                // Extra check: only send if the global ref still points to our session
                // meaning the user hasn't clicked stop/close in the meantime.
                if (sessionPromiseRef.current === sessionPromise) {
                  session.sendRealtimeInput({ media: pcmBlob });
                }
              }).catch(e => console.warn("Send input failed", e));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setMessages(prev => {
                if (currentTurnUserMessageIdRef.current === null) {
                  const newMessageId = Date.now();
                  currentTurnUserMessageIdRef.current = newMessageId;
                  return [...prev, { id: newMessageId, sender: 'user', text }];
                } else {
                  return prev.map(m =>
                    m.id === currentTurnUserMessageIdRef.current
                      ? { ...m, text: (m.text || '') + text }
                      : m
                  );
                }
              });
            }

            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setMessages(prev => {
                if (currentTurnBotMessageIdRef.current === null) {
                  const newMessageId = Date.now();
                  currentTurnBotMessageIdRef.current = newMessageId;
                  return [...prev, { id: newMessageId, sender: 'bot', text }];
                } else {
                  return prev.map(m =>
                    m.id === currentTurnBotMessageIdRef.current
                      ? { ...m, text: (m.text || '') + text }
                      : m
                  );
                }
              });
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              setVoiceStatus('speaking');

              if (!outputAudioContextRef.current) return;
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);

              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                  setVoiceStatus('listening');
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.turnComplete) {
              console.log('Turn complete.');
              currentTurnUserMessageIdRef.current = null;
              currentTurnBotMessageIdRef.current = null;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            // Don't recursive call stopVoiceSession immediately to avoid conflicts, just flag and reset
            setIsVoiceMode(false);
            setVoiceStatus('off');
            addMessage('system', 'Voice session disconnected.');
          },
          onclose: () => {
            console.log('Live session closed.');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction,
        },
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error("Failed to start voice session:", err);
      addMessage('system', 'Could not access microphone. Please check permissions and try again.');
      setIsVoiceMode(false);
      setVoiceStatus('off');
    }
  }, [ai]); // Removed stopVoiceSession from dep array to avoid recursion


  useEffect(() => {
    if (isVoiceMode) {
      setVoiceStatus('connecting');
      startVoiceSession();
    } else {
      stopVoiceSession();
    }
    return () => {
      stopVoiceSession();
    };
  }, [isVoiceMode, startVoiceSession, stopVoiceSession]);



  const renderChatFooter = () => {
    if (isVoiceMode) {
      let statusText = "";
      let icon = null;

      switch (voiceStatus) {
        case 'connecting':
          statusText = "Connecting...";
          icon = <MicrophoneIcon className="h-6 w-6 text-gray-500" />;
          break;
        case 'listening':
          statusText = "Listening...";
          icon = <MicrophoneIcon className="h-6 w-6 text-red-500 animate-pulse" />;
          break;
        case 'processing':
          statusText = "Processing...";
          icon = <img src="/logo.svg" alt="Processing" className="h-6 w-6 animate-spin" />;
          break;
        case 'speaking':
          statusText = "Speaking...";
          icon = <WaveIcon className="h-6 w-6 text-secondary animate-pulse" />;
          break;
        default:
          statusText = "Voice mode is off";
          icon = <MicrophoneIcon className="h-6 w-6 text-gray-500" />;
      }

      return (
        <div className="p-4 flex flex-col items-center justify-center border-t border-gray-200 dark:border-gray-700 min-h-[76px]">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            {icon}
            <span>{statusText}</span>
          </div>
        </div>
      );
    }

    switch (chatState) {
      case 'form':
        return (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {formStatus === 'sent' ? (
              <div className="text-center p-4 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <h3 className="font-bold text-green-800 dark:text-green-200">Message Sent!</h3>
                <p className="text-sm text-green-700 dark:text-green-300">Thank you. Our team will get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label htmlFor="form-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
                  <input id="form-name" type="text" name="name" placeholder="John Doe" required className="w-full p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary" />
                </div>
                <div>
                  <label htmlFor="form-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Email</label>
                  <input id="form-email" type="email" name="email" placeholder="you@example.com" required className="w-full p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary" />
                </div>
                <div>
                  <label htmlFor="form-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">How can we help?</label>
                  <textarea id="form-message" name="message" placeholder="Please describe your issue..." rows={3} required className="w-full p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary"></textarea>
                </div>
                <button type="submit" disabled={formStatus === 'sending'} className="w-full py-3 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
                  {formStatus === 'sending' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        );
      case 'live_chat':
      case 'escalating':
        return (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            Chat in progress with a human agent.
          </div>
        );
      case 'bot':
      default:
        return (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow p-3 bg-gray-100 dark:bg-primary-dark rounded-full border-transparent focus:ring-2 focus:ring-secondary"
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !inputValue.trim()} className="p-3 bg-secondary text-white rounded-full hover:bg-opacity-90 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">
                <SendIcon className="h-6 w-6" />
              </button>
            </form>
          </div>
        );
    }
  };


  return (
    <>
      <div className="group fixed bottom-5 right-5 z-50 flex flex-row-reverse items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-secondary text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-opacity-90 transition-transform transform hover:scale-110 flex-shrink-0"
          aria-label="Toggle chatbot"
        >
          {isOpen ? <CloseIcon className="h-8 w-8" /> : <img src="/logos/favicon.png" alt="Chat" className="h-10 w-10" />}
        </button>
        {!isOpen && (
          <span className="hidden sm:block max-w-0 group-hover:max-w-xs overflow-hidden whitespace-nowrap bg-white dark:bg-dark-card text-primary dark:text-white text-sm font-semibold px-0 group-hover:px-4 py-3 rounded-full shadow-lg transition-all duration-300 pointer-events-none">
            Chat with us
          </span>
        )}
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-5 z-50 w-[90vw] max-w-sm h-[70vh] max-h-[600px] bg-white dark:bg-dark-card rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
          <header className="flex items-center justify-between p-4 bg-primary text-white flex-shrink-0">
            <div>
              <h2 className="font-bold text-lg">Ven Logistics Chat</h2>
              <p className="text-xs text-gray-300">Your AI & Human Support</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={`p-2 rounded-full transition-colors ${isVoiceMode ? 'bg-red-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                title={isVoiceMode ? "Stop Voice Mode" : "Start Voice Mode"}
              >
                <MicrophoneIcon className="h-5 w-5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:text-gray-300">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
          </header>

          <div
            ref={chatBodyRef}
            className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-dark-bg"
          >
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg shadow-sm ${msg.sender === 'user'
                      ? 'bg-secondary text-white rounded-br-none'
                      : msg.sender === 'system'
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs text-center w-full shadow-none'
                        : 'bg-white dark:bg-primary-dark text-gray-800 dark:text-gray-200 rounded-bl-none'
                    }`}
                >
                  {msg.sender === 'system' ? (
                    msg.text
                  ) : (
                    <>
                      {msg.text && <FormattedBotResponse text={msg.text} />}
                      {msg.component}
                    </>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-primary-dark p-3 rounded-lg rounded-bl-none shadow-sm flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
          </div>

          {renderChatFooter()}
        </div>
      )}
    </>
  );
};

export default Chatbot;
