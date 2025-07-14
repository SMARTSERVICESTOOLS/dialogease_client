import React, { useEffect, useState, useRef } from 'react';
import { BASE_URL } from './base';
import DOMPurify from 'dompurify';
import Api from './Api';
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Howl } from 'howler';
import Markdown from 'marked-react';

function App({ keyProp, id }) {
  const { transcript, listening, resetTranscript } = useSpeechRecognition();
  const [soundSrc, setSoundSrc] = useState('');
  const [isSound, setIsSound] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const messageEl = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const [colors, setColors] = useState({});
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [TitleSuggestedMessages, setTitleSuggestedMessages] = useState('');
  const [suggestedMessages, setSuggestedMessages] = useState([]);
  const [privacy, setPrivacy] = useState('');
  const elementRef = useRef(null);
  const [height, setHeight] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [timeZone, setTimeZone] = useState('');
  const [initMessage, setIntMessage] = useState('');

  useEffect(() => {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      setSupported(false);
      console.error("Your browser does not support speech recognition.");
    }
  }, []);

  useEffect(() => {
    setMessage(transcript);
  }, [transcript]);

  const handleStart = () => {
    setRecording(true);
    SpeechRecognition.startListening({ continuous: true, language: "fr-FR" });
  };

  const handleStop = () => {
    SpeechRecognition.stopListening();
    setTimeout(() => {
      setRecording(false);
    }, 100);
  };

  const handleRecording = () => {
    if (listening) {
      handleStop();
    } else {
      handleStart();
    }
  }


  const playAudio = () => {
    const sound = new Howl({
      src: [`${BASE_URL + soundSrc}`],
    });

    if (isSound) {
      sound.play();
    }
  };

  useEffect(() => {
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(detectedTimeZone);
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (message.trim() && !isSending) {
      setIsSending(true);
      const msg = message;
      setMessages((prevMessages) => [...prevMessages, { role: 'user', content: msg }]);
      resetTranscript();
      setMessage('');
      let idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      if (!idConversation) {
        await createConversations();
        idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      }
      try {
        const response = await Api.post(`sendMessage`, { idConversation, message: msg, role: 'user', keyProp });
        setMessages(response.data.data.message.original.messages);

        playAudio();
      } catch (error) {
        if (error.response && error.response.status === 403) {
          getToken();
          try {
            const retryResponse = await Api.post('sendMessage', { idConversation, message: msg, role: 'user', keyProp });
            setMessages(retryResponse.data.data.message.original.messages);

            playAudio();
          } catch (retryError) {
            console.error('Error resending message:', retryError);
            refresh();
          }
        } else {
          console.error('Error sending message:', error);
        }
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
  };



  const getMessages = async () => {
    const idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
    if (idConversation) {
      try {
        const response = await Api.get(`getMessages/${idConversation}`);
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    }
  };

  const createConversations = async () => {
    try {

      const url = new URL(window.location.href);

      const allowedKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

      const queryParams = new URLSearchParams(new URL(url).search);

      allowedKeys.forEach((key) => {
        if (queryParams.has(key)) {
          const value = queryParams.get(key);
          url.searchParams.set(key, value);
        } else {
          const sessionValue = sessionStorage.getItem(key);
          if (sessionValue) {
            url.searchParams.set(key, sessionValue);
          }
        }
      });

      const response = await Api.post(`createConversation`, { chat_id: keyProp, url, timezone: timeZone });
      sessionStorage.setItem('jsqhgdhshziqjlyruizeyryyueg', response.data.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  function refresh() {
    setIsSpinning(true);
    setTimeout(() => {
      sessionStorage.removeItem("jsqhgdhshziqjlyruizeyryyueg");
      setMessages([{ role: 'assistant', content: initMessage }])
      setMessage('');
      setIsSending(false)
      setIsSpinning(false)
    }, 1000);
  }

  useEffect(() => {
    const currentMessageEl = messageEl.current;
    const handleScroll = () => {
      if (currentMessageEl) {
        currentMessageEl.scroll({ top: currentMessageEl.scrollHeight, behavior: 'smooth' });
      }
    };
    const observer = new MutationObserver(handleScroll);
    if (currentMessageEl) {
      observer.observe(currentMessageEl, {
        childList: true, // Observe direct children
        subtree: true // Observe all descendants
      });
    }
    // Scroll to the bottom initially
    handleScroll();
    // Cleanup on component unmount
    return () => {
      observer.disconnect();
    };
  }, [messages]);

  const getToken = () => {
    Api.get('csrf-token', { params: { type: "page" } })
      .then((response) => {
        const token = response.data.token;
        Api.defaults.headers.common['X-CSRF-TOKEN'] = token;
      })
      .catch((error) => {
        console.error('Error fetching token:', error);
      });
  };

  const getChatColors = () => {
    Api.get(`getchatColors/${keyProp}`).then((response) => {
      setColors(JSON.parse(response.data.colors));
      setSoundSrc(response.data.soundSrc)
      setIsSound(response.data.isSound)
      setName(response.data.display_name ?? response.data.name);
      setImage(response.data.image);

      if (SpeechRecognition.browserSupportsSpeechRecognition()) {
        var rec = response.data.isRecording == 1 ? true : false;
        setSupported(rec);
      }
      setTitleSuggestedMessages(response.data.title_suggested_messages)

      setSuggestedMessages(response.data.suggested_messages ?? []);
      setPrivacy(response.data.message_privacy);

      setLoading(false);
      setIntMessage(response.data.init_message)

      const idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      if (!idConversation) {
        setMessages([{ role: 'assistant', content: response.data.init_message }]);
      }

      setPlaceholder(response.data.placeholder);
    });
  };


  useEffect(() => {

    const referrer = document.referrer;
    const referrerDomain = referrer ? new URL(referrer).hostname : '';

    const url = new URL(window.location.href);

    const queryParams = new URLSearchParams(url.search);

    const allowedKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    var currentDomain = new URL(url).hostname;
    if (!queryParams.has('utm_source') && referrerDomain && referrerDomain !== currentDomain) {
      referrerDomain = referrerDomain.replace(/^www\./, "");
      sessionStorage.setItem('utm_source', referrerDomain);
    }

    queryParams.forEach((value, key) => {
      if (allowedKeys.includes(key)) {
        sessionStorage.setItem(key, value);
      }
    });

  }, []);

  useEffect(() => {
    // axios.defaults.withCredentials = true;
    getToken();


    const idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
    if (idConversation) {
      setTimeout(() => {
        getMessages();
      }, 1000);
    }
    setLoading(true);

    setTimeout(() => {
      getChatColors();
    }, 1000);
  }, [keyProp]);

  const Suggest = async (msg) => {
    if (!isSending) {
      let idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      if (!idConversation) {
        await createConversations();
        idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      }


      setMessages((prevMessages) => [...prevMessages, { role: 'user', content: msg }]);
      setTimeout(() => {
        setIsSending(true);
      }, 1000);

      try {
        resetTranscript();
        const response = await Api.post(`sendMessage`, { idConversation, message: msg, role: 'user', keyProp });
        setMessages(response.data.data.message.original.messages);
        setIsSending(false);
        playAudio();
      } catch (error) {
        if (error.response && error.response.status === 403) {
          getToken();
          try {
            const retryResponse = await Api.post('sendMessage', { idConversation, message: msg, role: 'user', keyProp });
            setMessages(retryResponse.data.data.message.original.messages);
            setIsSending(false);
            playAudio();
          } catch (retryError) {
            console.error('Error resending message:', retryError);
          }
        } else {
          console.error('Error sending message:', error);
        }
      }
    }
  };

  function formatContentOld(content) {
    // Remove 【number:number†source】 pattern
    console.log(content)
    content = content.replace(/【\d+:\d+†source】/g, '');
    content = content.replace(/json/g, '');

    const firstOpen = content.indexOf('{');
    const lastClose = content.lastIndexOf('}');

    let jsonData = null;
    let jsonString = null;

    if (firstOpen !== -1 && lastClose !== -1 && firstOpen < lastClose) {
      jsonString = content.slice(firstOpen, lastClose + 1);
      try {
        jsonData = JSON.parse(jsonString);
      } catch (e) {
        console.error('Erreur lors de l\'analyse du JSON :', e);
      }
    }


    if (jsonData && jsonData.ads && jsonString) {
      console.log(jsonData['ads'])
      // jsonData = jsonData[1].trim();
      const parsedData = jsonData['ads'];

      let jsonToHtml = `<div>`;

      parsedData.forEach(data => {
        jsonToHtml += `<a   class="jsonParent"  ${data.url ? `href="${data.url}" target="_blank"` : ''} >
         ${data.image ? `<img src="${data.image}" />` : ''}
          <div>${data.title}</div>
          </a>`;
      });

      jsonToHtml += `</div>`;

      content = content.replace(jsonString, jsonToHtml);
    }


    // Replace new line characters with <br /> tags
    let formattedContent = content.replace(/\n/g, '<br />');

    // Bold text (double asterisks)
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // Italic text (single asterisks or underscores)
    formattedContent = formattedContent.replace(/(?:\*{1}(.*?)\*{1}|_{1}(.*?)_{1})/g, (match, p1, p2) => {
      return `<i>${p1 || p2}</i>`;
    });

    // Strikethrough text (double tildes)
    formattedContent = formattedContent.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Links ([link text](URL))
    formattedContent = formattedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="a-link" href="$2" target="_blank">$1</a>');

    // Inline code (backticks)
    formattedContent = formattedContent.replace(/`(.*?)`/g, '<code>$1</code>');

    // Sanitize the formatted content to prevent XSS attacks
    return DOMPurify.sanitize(formattedContent, {
      ADD_ATTR: ['target']
    });
  }

  function formatContent(content) {
    const rawHtml = marked.parse(content);
    // Sanitize the formatted content to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['target']
    });
  }
  function calcY(x) {
    console.log(x)
    return -0.1 * x + 90 - 7;
  }


  const [pageHeight, setPageHeight] = useState(0);

  useEffect(() => {
    const appPage = document.getElementById(id);
    const parent = appPage?.parentElement;
    const parentHeight = parent?.getBoundingClientRect().height || 0;
    const dvh = window.visualViewport?.height || window.innerHeight;
    setPageHeight(Math.min(parentHeight, (dvh - 50)));
  }, []);


  useEffect(() => {

    let ele = document.getElementById(id);
    // If elementRef is valid
    if (elementRef.current) {
      // const elementHeight = elementRef.current.getBoundingClientRect().height;
      // // Set a minimum height of 600px if the current height is less
      // if (elementHeight < 600) {
      //   ele.style.height = '600px';
      // }
      // Calculate the height (this will reflect after applying the min height)
      // Set height to 100% with !important
      elementRef.current.style.setProperty('height', '100%', 'important');

      // const newHeight = elementRef.current.getBoundingClientRect().height;
      // setHeight(calcY(newHeight));
    }
  }, []);

  let style = `


  .main-card-iframe-${keyProp} *{
  all:revert-layer;
  }

  .a-link {
   
    color: blue; /* Change the color of the link */
    text-decoration: underline; /* Underline the link */
    
}

/* Add a hover effect */
.a-link:hover {
 
    color: darkblue; /* Darken the color on hover */
    
}

/* Optional: Indicate that the link opens in a new tab */
.a-link::after {
 
    content: ' ↗'; /* Add a small arrow icon */
    font-size: smaller; /* Make the arrow smaller */
    color: gray; /* Change the arrow color */
    
}



.card${keyProp} {
 
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 10rem;
}

    
.main-card-iframe-${keyProp} .page-Gkdshjgfkjdgf {
  width: 100%;
  height: 100%;
  direction: ${colors.dir};
}

.main-card-iframe-${keyProp} .marvel-device-Gkdshjgfkjdgf .screen-Gkdshjgfkjdgf {
  text-align: left;
}

.main-card-iframe-${keyProp} .screen-Gkdshjgfkjdgf-container {
  height: 100%;
}

/* Status Bar */

.main-card-iframe-${keyProp} .status-bar {
  height: 25px;
  background: #004e45;
  color: #fff;
  font-size: 14px;
  padding: 0 8px;
}

.main-card-iframe-${keyProp} .status-bar:after {
  content: "";
  display: table;
  clear: both;
}

.main-card-iframe-${keyProp} .status-bar div {
 
  float: right;
  position: relative;
  top: 50%;
  transform: translateY(-50%);
  margin: 0 0 0 8px;
  font-weight: 600;
  
}

.main-card-iframe-${keyProp} .jsonParent {
	display: flex;
	align-items: center;
	margin-bottom: 15px;
	background-color: aliceblue;
	border-radius: 5px;
  min-height: 60px;
}

.main-card-iframe-${keyProp} .jsonParent > img {
	height: 90px;
	width: 90px;
	margin-right: 10px;
	border-radius: 5px;
}


/* Chat */

.main-card-iframe-${keyProp} .chat {
 
  height: 100%;
  
}

.main-card-iframe-${keyProp} .chat-container-Gkdshjgfkjdgf {
 
  height: 100%;
  
}

/* User Bar */

.main-card-iframe-${keyProp} .user-bar-Gkdshjgfkjdgf {
 
  height: 60px;
  background: #${colors.primaryColor};
  color: #${colors.secondaryColor};
  secondaryColor
  padding: 0 8px;
  font-size: 24px;
  position: relative;
  z-index: 1;
  border-radius: 5px 5px 0 0;
  display:flex;
  align-items: start;
 }

.main-card-iframe-${keyProp} .user-bar-Gkdshjgfkjdgf:after {
 
  content: "";
  display: table;
  clear: both;
  
}

.main-card-iframe-${keyProp} .user-bar-Gkdshjgfkjdgf div {
 
  float: left;
  transform: translateY(-50%);
  position: relative;
  top: 50%;
  
}

.main-card-iframe-${keyProp} .user-bar-Gkdshjgfkjdgf .actions-Gkdshjgfkjdgf {
 
  float: right;
  margin: 0 0 0 85px;
  display:flex;
  
}



.main-card-iframe-${keyProp} .user-bar-Gkdshjgfkjdgf .avatar-Gkdshjgfkjdgf {
 
  margin: 0 0 0 5px;
  width: 50px;
  height: 50px;
  
}

.main-card-iframe-${keyProp} .user-bar-Gkdshjgfkjdgf .avatar-Gkdshjgfkjdgf img {
 
  border-radius: 50%;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1);
  display: block;
  width: 100%;
  
}

.main-card-iframe-${keyProp} .user-bar-Gkdshjgfkjdgf .name {
 
  font-size: 18px;
  font-weight: 600;
  text-overflow: ellipsis;
  letter-spacing: 0.3px;
  margin: 0 0 0 8px;
  overflow: hidden;
  white-space: nowrap;
  width: 70%;
    display: flex;
    
}



/* Conversation */

.main-card-iframe-${keyProp} .conversation {
 
  height: calc(100% - ${height}px);
  position: relative;
   background: ${colors.checked ? '#' + colors.pgColor : 'url(' + BASE_URL + '/' + colors.pgImage + ')'};
     background-position:  ${colors.position} ;
      background-size: 100% 100%;
  z-index: 0;
  
}

.main-card-iframe-${keyProp} .conversation ::-webkit-scrollbar {
 
  transition: all .5s;
  width: 5px;
  height: 1px;
  z-index: 10;
  
}

.main-card-iframe-${keyProp} .conversation ::-webkit-scrollbar-track {
 
  background: #fff;

}

.main-card-iframe-${keyProp} .conversation ::-webkit-scrollbar-thumb {
 
  background: #b3ada7;
  
}

.main-card-iframe-${keyProp} .conversation .conversation-container-Gkdshjgfkjdgf {
 
  height: calc(100% -  ${suggestedMessages.length ? '60' : '60'}px);
  box-shadow: inset 0 10px 10px -10px #000000;
  overflow-x: auto;
  padding: 0 16px;
  margin-bottom: 5px;
  
}

.main-card-iframe-${keyProp} .conversation .conversation-container-Gkdshjgfkjdgf:after {
 
  content: "";
  display: table;
  clear: both;
  
}

/* Messages */

.main-card-iframe-${keyProp} .message {
 
  clear: both;
  line-height: 1.5rem;
  font-size: 15px;
  padding: 8px;
  position: relative;
  margin: 10px 0;
  max-width: 85%;
   white-space: pre-wrap;
  word-wrap: break-word;
  font-size:${colors.fontSize}px;
  
}


.main-card-iframe-${keyProp} .messageS {
  clear: both;
  line-height: 1.5rem;
  font-size: 15px;
  padding: 8px;
  position: relative;
  margin: 10px 0;
  max-width: 85%;
   white-space: pre-wrap;
  word-wrap: break-word;
  font-size:${colors.fontSize}px;
}

.main-card-iframe-${keyProp} .message:after {
 
  position: absolute;
  content: "";
  width: 0;
  height: 0;
  border-style: solid;
  
}



.main-card-iframe-${keyProp} .message:first-child {
  margin: 16px 0 8px;
}

.main-card-iframe-${keyProp} .message.receivedltr {
 
  background: #${colors.pgReceived};
  color:#${colors.colorReceived};
  border-radius: 0px 5px 5px 5px;
  float: left;
  
}


.main-card-iframe-${keyProp} .message.receivedltr:after {
 
  border-width: 0px 10px 10px 0;
  border-color: transparent #${colors.pgReceived} transparent transparent;
  top: 0;
  left: -10px;
  
}

.main-card-iframe-${keyProp} .message.sentltr {
 
  background: #${colors.pgSent};
  color:#${colors.colorSent};
  border-radius: 5px 0px 5px 5px;
  float: right;
  
}

.main-card-iframe-${keyProp} .message.sentltr:after {
 
  border-width: 0px 0 10px 10px;
  border-color: transparent transparent transparent #${colors.pgSent};
  top: 0;
  right: -10px;
  
}




.message.receivedrtl {
 
   background: #${colors.pgReceived};
  color:#${colors.colorReceived};
  border-radius: 5px 0px 5px 5px;
  float: right;
  
}
.message.receivedrtl:after {
 
  border-width: 0px 0 10px 10px;
  border-color: transparent transparent transparent #${colors.pgReceived};
  top: 0;
  right: -10px;
  
}

.message.sentrtl {
  background: #${colors.pgSent};
  color:#${colors.colorSent};
  border-radius: 0px 5px 5px 5px;
  float: left;
  
}

.message.sentrtl:after {
  border-width: 0px 10px 10px 0;
  border-color: transparent #${colors.pgSent} transparent transparent;
  top: 0;
  left: -10px;
  
}


/* Compose */

.main-card-iframe-${keyProp} .conversation-compose {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  overflow: hidden;
  height: 47px;
  width: calc(100% - 10px);
background: #fff;
padding:5px;
  
}

.main-card-iframe-${keyProp} .conversation-compose div,
.conversation-compose textarea {
  background: #fff;
  height: 100%;
  
}



.main-card-iframe-${keyProp} .conversation-compose .input-msg {
  border: 0;
  flex: 1 1 auto;
  font-size: 16px;
  margin: 0 5px;
  outline: none;
  min-width: 50px;
  padding: 0;
  font-family: sans-serif;
}


.main-card-iframe-${keyProp} .conversation-compose .send {
  background: transparent;
  border: 0;
  cursor: pointer;
  flex: 0 0 auto;
  margin-left: 8px;
  margin-right: 8px;
  padding: 0;
  position: relative;
  outline: none;
  margin-bottom: 0;
  
}

.main-card-iframe-${keyProp} .conversation-compose .send .circle {
  background:  #${colors.primaryColor};
  border-radius: 50%;
  color: #${colors.secondaryColor};
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  
}

.main-card-iframe-${keyProp} .conversation-compose .send .circle i {
  font-size: 24px;
}

    .main-card-iframe-${keyProp} {
      background: transparent;
      color: white;
      min-width: 400px;
      min-height: 600px;
      height: ${pageHeight}px;
      margin: 0px;
      border-radius: 0;
      display: flex;
      flex-direction: column;
      overflow: visible;
      box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
    }

 @media (min-width: 450px) {
   .main-card-iframe-${keyProp} {
      width: 100%;
    }
 }

    .input-div${keyProp} {
      height: 48px;
      display: flex;
    }

    .input-message${keyProp} {
      padding: 8px 48px 8px 16px;
      flex-grow: 1;
      border: none;
    }

    .input-send${keyProp} {
      background: transparent;
      width: 48px;
      height: 48px;
      border: none;
      cursor: pointer;
    }

    .chat-message-assistance${keyProp} {
       margin: 8px 16px 8px 50px; /* Adjust margins as needed */
      padding: 8px 16px;
      animation-name: fadeIn;
      animation-iteration-count: 1;
      animation-timing-function: ease-in;
      animation-duration: 100ms;
      color: black;
      border-radius: 8px 8px 2px 8px;
      background-color: lavender;
      align-self: flex-start; 
      word-break: break-all;
    }
    .chat-message-user${keyProp}{
         margin: 8px 50px 8px 16px; 
        padding: 8px 16px;
        animation-name: fadeIn;
        animation-iteration-count: 1;
        animation-timing-function: ease-in;
        animation-duration: 100ms;
        color: black;
        border-radius: 8px 8px 8px 2px;
        background-color: lavender;
        align-self: flex-end;
 
    }

    @keyframes fadeIn${keyProp} {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    ::-webkit-scrollbar {
      width: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: #888;
    }




 .main-card-iframe-${keyProp} .suggested-messages-container {
  margin-left: 0.5rem;            /* mx-2 (0.5rem = 8px left margin) */
  margin-right: 0.5rem;           /* mx-2 (0.5rem = 8px right margin) */
  display: flex;                  /* flex */
  overflow-x: auto;               /* horizontal scrolling */
  scroll-behavior: smooth;        /* smooth scrolling behavior */
  gap: 0.5rem;                    /* gap-2 (0.5rem = 8px gap between flex items) */
  border-radius: 0.375rem;        /* rounded-md (0.375rem = 6px border radius) */
  margin-bottom: 0.5rem;         /* margin at the bottom */
  -webkit-overflow-scrolling: touch; /* improves scrolling on mobile */
  width: 100%%;
  height:44px;
  align-items: end;
  padding-bottom:0.5rem;
}


  .main-card-iframe-${keyProp} .suggested-message {
  color: #414346;
  background-color: #fff;      /* light gray background */
  padding: 0.5rem;                /* padding for each message */
  border-radius: 0.375rem;        /* rounded corners */
  white-space: nowrap;            /* keep the text on one line */
  cursor: pointer;                /* show pointer on hover */
  transition: background-color 0.3s; /* smooth hover transition */
  font-size: 13px;
}

.main-card-iframe-${keyProp} .suggested-messages-container {
  scrollbar-width: thin;              /* Make scrollbar thinner */
  scrollbar-color: #888 #f1f1f1;      /* Thumb color (first) and track color (second) */
}

 .main-card-iframe-${keyProp} .suggested-message:hover {
  background-color: #d1d5db;      /* darker gray background on hover */
}

 .main-card-iframe-${keyProp} #privacy-container-15645314545643sd5hgthjfgjh {
  min-height: 1.8rem !important;      
  background-color: rgb(242 245 248);   
  display: flex;                
  align-items: center;         
  padding-left: 0rem;          
  padding-right: 0rem;         
  font-size: 0.8rem;
  color: #3339;
  justify-content: center;
  width: 100% ;
  border-radius:0 0 5px 5px;
}

 .main-card-iframe-${keyProp} #privacy-container-15645314545643sd5hgthjfgjh a {
    color:#3339;
}


 .main-card-iframe-${keyProp} #privacy-container-15645314545643sd5hgthjfgjh p {
 all: unset;
}

 .main-card-iframe-${keyProp} .suggested-message:hover {
  background-color: #d1d5db;     
}

@keyframes l {
  to {
    clip-path: inset(0 -1ch 0 0)
  }
}0% {background-position: center}
}



 .main-card-iframe-${keyProp} .lds-ellipsis,
.lds-ellipsis div {
  box-sizing: border-box;
}
 .main-card-iframe-${keyProp} .lds-ellipsis {
  display: inline-block;
  position: relative;
  width: 80px;
}
 .main-card-iframe-${keyProp} .lds-ellipsis div {
  position: absolute;
top: -10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
 .main-card-iframe-${keyProp} .lds-ellipsis div:nth-child(1) {
  left: 8px;
  animation: lds-ellipsis1 0.6s infinite;
}
 .main-card-iframe-${keyProp} .lds-ellipsis div:nth-child(2) {
  left: 8px;
  animation: lds-ellipsis2 0.6s infinite;
}
 .main-card-iframe-${keyProp} .lds-ellipsis div:nth-child(3) {
  left: 32px;
  animation: lds-ellipsis2 0.6s infinite;
}
 .main-card-iframe-${keyProp} .lds-ellipsis div:nth-child(4) {
  left: 56px;
  animation: lds-ellipsis3 0.6s infinite;
}
@keyframes lds-ellipsis1 {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes lds-ellipsis3 {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0);
  }
}
@keyframes lds-ellipsis2 {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(24px, 0);
  }
}



@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 1s linear infinite;
}


.main-card-iframe-${keyProp} .Rec{
	animation-name: pulse;
	animation-duration: 1.5s;
	animation-iteration-count: infinite;
	animation-timing-function: linear;
  background: red !important;
}

@-webkit-keyframes pulse {
  0% {
    -webkit-box-shadow: 0 0 0 0 rgba(0,0,0, 0.5);
  }
  70% {
      -webkit-box-shadow: 0 0 0 50px rgba(0,0,0, 0);
  }
  100% {
      -webkit-box-shadow: 0 0 0 0 rgba(0,0,0, 0);
  }
}
@keyframes pulse {
  0% {
    -moz-box-shadow: 0 0 0 0 rgba(0,0,0, 0.5);
    box-shadow: 0 0 0 0 rgba(0,0,0, 0.4);
  }
  70% {
      -moz-box-shadow: 0 0 0 50px rgba(0,0,0, 0);
      box-shadow: 0 0 0 50px rgba(0,0,0, 0);
  }
  100% {
      -moz-box-shadow: 0 0 0 0 rgba(0,0,0, 0);
      box-shadow: 0 0 0 0 rgba(0,0,0, 0);
  }
}



  .loaderP2024SSX5 {
   width: 24px;
            height: 24px !important;
            border-radius: 50%;
            position: relative;
            transform:rotate(45deg);
            background: #fff;
 }
 .loaderP2024SSX5:before{
  content: "";
            box-sizing: border-box;
            position: absolute;
            inset: 0px;
            border-radius: 50%;
            border:12px solid #${colors.primaryColor};
            animation: prixClipFix 2s infinite linear;
            }
 @keyframes prixClipFix {
              0%   {clip-path:polygon(50% 50%,0 0,0 0,0 0,0 0,0 0)}
              25%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 0,100% 0,100% 0)}
              50%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,100% 100%,100% 100%)}
              75%  {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,0 100%,0 100%)}
              100% {clip-path:polygon(50% 50%,0 0,100% 0,100% 100%,0 100%,0 0)}
          }

            .poweredBy${keyProp}{
      width: 100% !important;
      background-color: rgb(242 245 248);
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 8px;
      box-shadow: 0 4px 1px rgba(0, 0, 0, 0.2), 0 8px 2px rgba(0, 0, 0, 0.19);
          display: flex;
    justify-content: center;
     z-index: 999998;
    }
  `;

  return (
    <> {
      !loading && <>
        <style>{style}</style>
        <div className={`card${keyProp}`}>
          <div className={`main-card-iframe-${keyProp}`} ref={elementRef}>
            <div className="page-Gkdshjgfkjdgf">
              <div className="marvel-device-Gkdshjgfkjdgf nexus5-Gkdshjgfkjdgf" style={{ height: '90.2%' }}>
                <div className="screen-Gkdshjgfkjdgf" style={{ height: '100%' }}>
                  <div className="screen-container-Gkdshjgfkjdgf" style={{ height: '100%' }}>
                    <div className="chat">
                      <div className="chat-container-Gkdshjgfkjdgf">
                        <div className="user-bar-Gkdshjgfkjdgf" style={{ justifyContent: "space-between" }}>
                          <div className='user-bar-Gkdshjgfkjdgf' style={{ width: "100%" }}>
                            <div className="avatar-Gkdshjgfkjdgf">
                              <img src={BASE_URL + image} alt="avatar-Gkdshjgfkjdgf" />
                            </div>
                            <div className="name">
                              <span>{name}</span>
                            </div>
                          </div>

                          <div className="actions-Gkdshjgfkjdgf" style={{ marginRight: "0rem", cursor: 'pointer', marginLeft: '0rem', minWidth: "40px" }}>
                            <svg onClick={refresh} style={{ width: '25px', marginRight: '2px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`${isSpinning ? 'spin' : ''}`} >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                          </div>
                        </div>
                        <div className="conversation" >
                          <div className="conversation-container-Gkdshjgfkjdgf" ref={messageEl}>
                            {messages.map((msg, index) => (
                              <div key={index} dir={colors.dir} className={`message ${msg.role === 'user' ? 'sent' + colors.dir : 'received' + colors.dir}`}>
                                {/* <span dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} /> */}
                                <Markdown>{msg.content}</Markdown>
                              </div>
                            ))}
                            {
                              isSending && <div key='isSending' className={`message ${'received' + colors.dir} `}>
                                <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                              </div>
                            }

                            {suggestedMessages.length && messages.length <= 1 ?

                              <div className='messageS' style={{ marginTop: '10px' }}>

                                <p style={{ color: "#676b73" }}>{TitleSuggestedMessages}</p>

                                {
                                  suggestedMessages.map((suggestedMessage, index) =>
                                    <span key={index} className='suggested-message' style={{ display: 'block', marginTop: "10px" }} onClick={() => Suggest(suggestedMessage)}>{suggestedMessage}</span>
                                  )
                                }
                              </div> : ''}

                          </div>

                          <div className='suggestedMessagesDev'>
                          </div>

                          <form onSubmit={send}>

                            <div className='conversation-compose'>
                              <textarea style={{ resize: 'none' }} className="input-msg" name="input" placeholder={placeholder} autoComplete="off" value={message} onChange={handleChange} autoFocus
                                rows={2}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    send(e);
                                  }
                                }}></textarea>
                              {
                                supported && (message.length == 0 || recording) ?
                                  <button type='button' className="send" disabled={isSending}
                                    onClick={handleRecording}
                                  >
                                    {
                                      listening ?
                                        <div className="circle Rec">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width={28} strokeWidth={1.5} stroke="currentColor" >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                          </svg>
                                        </div> :
                                        <>
                                          {isSending ? (
                                            // Loader element
                                            <div className="circle">
                                              <div className="loaderP2024SSX5"></div>
                                            </div>
                                          ) : (
                                            <div className="circle">
                                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={28}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                              </svg>
                                            </div>
                                          )}
                                        </>

                                    }

                                  </button> :
                                  <button className="send" disabled={isSending}>
                                    <div className="circle">
                                      {isSending ? (
                                        // Loader element
                                        <div className="loaderP2024SSX5"></div>
                                      ) : (
                                        <svg style={{ ...(colors.dir === "rtl" && { transform: "rotate(260deg)" }), }} xmlns="http://www.w3.org/2000/svg" strokeWidth={1.5} width={28} fill="none" viewBox="0 0 20 20">
                                          <path fill="currentColor" d="M15.44 1.68c.69-.05 1.47.08 2.13.74.66.67.8 1.45.75 2.14-.03.47-.15 1-.25 1.4l-.09.35a43.7 43.7 0 0 1-3.83 10.67A2.52 2.52 0 0 1 9.7 17l-1.65-3.03a.83.83 0 0 1 .14-1l3.1-3.1a.83.83 0 1 0-1.18-1.17l-3.1 3.1a.83.83 0 0 1-.99.14L2.98 10.3a2.52 2.52 0 0 1 .04-4.45 43.7 43.7 0 0 1 11.02-3.9c.4-.1.92-.23 1.4-.26Z"></path>
                                        </svg>
                                      )}
                                    </div>
                                  </button>
                              }
                            </div>

                          </form>
                        </div>

                        <div id='privacy-container-15645314545643sd5hgthjfgjh' dangerouslySetInnerHTML={{ __html: privacy }} />
                        <div className={`poweredBy${keyProp}`}>
                          <a href={`https://dialogease.com?utm_campaign=${window.location.hostname}&utm_source=powered-by&utm_medium=chatbot`} target='_blank' rel="noopener noreferrer">
                            <img src={BASE_URL + '/images/logo.png'} style={{ width: '100px' }} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* <div style={{ display: 'flex', justifyContent: 'center', width: '400px', marginTop: '4px', backgroundColor: 'rgba(226, 232, 240, 0.44)' }}> */}
            {/* <div className={`poweredBy${keyProp}`}>
              <a href={`https://dialogease.com?utm_campaign=${window.location.hostname}&utm_source=powered-by&utm_medium=chatbot`} target='_blank' rel="noopener noreferrer">
                <img src={BASE_URL + '/images/logo.png'} style={{ width: '100px' }} />
              </a>
            </div> */}

          </div>

        </div>
      </>
    }

    </>
  );
}

export default App;
