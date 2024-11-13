import React, { useEffect, useState, useRef } from 'react';
import { BASE_URL } from './base';
import DOMPurify from 'dompurify';

import Api from './Api';

function App({ keyProp }) {
  const audioRef = useRef(new Audio(BASE_URL + '/assets/whatsapp.mp3'));
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const messageEl = useRef(null);
  const [typing, setTyping] = useState(false);
  const [colors, setColors] = useState({});
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [seconds, setSeconds] = useState(null);
  const [suggestedMessages, setSuggestedMessages] = useState([]);
  const [privacy, setPrivacy] = useState('');
  const [initMessage, setIntMessage] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  useEffect(() => {
    const savedVisibility = sessionStorage.getItem('isVisible');
    if (savedVisibility !== null) {
      setIsVisible(JSON.parse(savedVisibility));
    } else {
      setIsVisible(true);
      sessionStorage.setItem('isVisible', JSON.stringify(true));
    }
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const hiddenInitMessage = () => {
    setIsVisible(false);

    sessionStorage.setItem('isVisible', JSON.stringify(false));

  };


const send = async (e) => {
    e.preventDefault();
    if (message.trim()) {
        let idConversation = sessionStorage.getItem('ksdyughiqgfdukhysqguyh');
        if (!idConversation) {
            await createConversations();
            idConversation = sessionStorage.getItem('ksdyughiqgfdukhysqguyh');
        }


        setMessages((prevMessages) => [...prevMessages, { role: 'user', content: message }]);
        const msg = message;
        setMessage('');
        setTimeout(() => {
            setTyping(true);
        }, 400);

        try {
            const response = await Api.post(`sendMessage`, { idConversation, message: msg, role: 'user', keyProp });
            setMessages(response.data.data.message.original.messages);
            setTyping(false);
            playAudio();
        } catch (error) {

            if (error.response && error.response.status === 403) {
                getToken();
                try {
                    const retryResponse = await Api.post('sendMessage', { idConversation, message: msg, role: 'user', keyProp });
                    setMessages(retryResponse.data.data.message.original.messages);
                    setTyping(false);
                    playAudio();
                } catch (retryError) {
                    console.error('Error resending message:', retryError);
                    refresh();
                }
            } else {
                console.error('Error sending message:', error);
            }
        }
    }
};

  const handleChange = (e) => {
    setMessage(e.target.value);
  };

  const toggle = () => {
    setCollapsed(!collapsed);
  };

  const getMessages = async () => {
    const idConversation = sessionStorage.getItem('ksdyughiqgfdukhysqguyh');
    if (idConversation) {
      setConversationId(idConversation)
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
        const url = window.location.href;
        const response = await Api.post(`createConversation`, { chat_id: keyProp, url });
        sessionStorage.setItem('ksdyughiqgfdukhysqguyh', response.data.id);
    } catch (error) {
        if (error.response && error.response.status === 403) {
            getToken();
            createConversations();
        }
        console.error('Error creating conversation:', error);
    }
};

function refresh() {
  setIsSpinning(true);
  setTimeout(() => {
      sessionStorage.removeItem("ksdyughiqgfdukhysqguyh");
      setMessages([{ role: 'assistant', content: initMessage }])
      setMessage('');
      setTyping(false)
      setIsSpinning(false)
  }, 1000);
}
  useEffect(() => {
    const handleScroll = (event) => {
      const { currentTarget: target } = event;
      target.scroll({ top: target.scrollHeight, behavior: 'smooth' });
    };

    const currentMessageEl = messageEl.current;
    if (currentMessageEl) {
      currentMessageEl.addEventListener('DOMNodeInserted', handleScroll);
    }

    // Cleanup on component unmount
    return () => {
      if (currentMessageEl) {
        currentMessageEl.removeEventListener('DOMNodeInserted', handleScroll);
      }
    };
  }, [messages]);

  const getToken = () => {
    Api.get('csrf-token', { params: { type: "bulle" } })
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
      setName(response.data.name);
      setImage(response.data.image);

      setSuggestedMessages(response.data.suggested_messages ?? []);
      setPrivacy(response.data.message_privacy);

      setLoading(false);

      const idConversation = sessionStorage.getItem('ksdyughiqgfdukhysqguyh');

      if (!idConversation) {
        setMessages([{ role: 'assistant', content: response.data.init_message }]);
      }
      setIntMessage(response.data.init_message)

      setPlaceholder(response.data.placeholder);
      setSeconds(response.data.seconds);

      const popup = sessionStorage.getItem('popup');
      if (response.data.seconds && !popup) {
        setTimeout(() => {
          toggle();
          sessionStorage.setItem('popup', 'true');
        }, response.data.seconds * 1000);
      }
    });
  };

  useEffect(() => {
    // axios.defaults.withCredentials = true;

    getToken();


    const idConversation = sessionStorage.getItem('ksdyughiqgfdukhysqguyh');
    if (idConversation) {
      setConversationId(idConversation)
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
    if (!typing) {
        let idConversation = sessionStorage.getItem('ksdyughiqgfdukhysqguyh');
        if (!idConversation) {
            await createConversations();
            idConversation = sessionStorage.getItem('ksdyughiqgfdukhysqguyh');
        }


        setMessages((prevMessages) => [...prevMessages, { role: 'user', content: msg }]);
        setTimeout(() => {
            setTyping(true);
        }, 1000);

        try {
            const response = await Api.post(`sendMessage`, { idConversation, message: msg, role: 'user', keyProp });
            setMessages(response.data.data.message.original.messages);
            setTyping(false);
            playAudio();
        } catch (error) {
            if (error.response && error.response.status === 403) {
                getToken();
                try {
                    const retryResponse = await Api.post('sendMessage', { idConversation, message: msg, role: 'user', keyProp });
                    setMessages(retryResponse.data.data.message.original.messages);
                    setTyping(false);
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

  function formatContent(content) {
    // Remove 【number:number†source】 pattern
    content = content.replace(/【\d+:\d+†source】/g, '');

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
    formattedContent = formattedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="a-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Inline code (backticks)
    formattedContent = formattedContent.replace(/`(.*?)`/g, '<code>$1</code>');

    // Sanitize the formatted content to prevent XSS attacks
    return DOMPurify.sanitize(formattedContent, {
      ADD_ATTR: ['target']
    });
  }


  let style = `


  .main-card${keyProp} *{
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



    @media (min-width: 450px) {
    .poweredBy${keyProp}{
        position: fixed;
        bottom: 9px;
        right: 15px;
        width: 400px;
        background-color: white;
        z-index: 999998;
        border-bottom-right-radius: 8px;
        border-bottom-left-radius: 8px;
        box-shadow: 0 4px 1px rgba(0, 0, 0, 0.2), 0 8px 2px rgba(0, 0, 0, 0.19);
      }
  
      .main-card${keyProp} {
       
        width: 96%;
        max-width: 400px;
        height: calc(100% - 32px) !important;
        /*border-radius: 8px !important;*/
        max-height: 600px; /*600px*/
right: 15px !important;
  bottom: 40px !important;
    }

    }

    .collapsed${keyProp} {
     
      width: 0px !important;
      height: 0px !important;
      border-radius: 24px !important;
      margin: 16px !important;
      
    }



.card${keyProp} {
 
  width: 100%;
  height: 100%;
  
}

    
.main-card${keyProp} .page-Gkdshjgfkjdgf {
 
  width: 100%;
  height: 100dvh;
   direction: ${colors.dir};
  
}

.main-card${keyProp} .marvel-device-Gkdshjgfkjdgf .screen-Gkdshjgfkjdgf {
 
  text-align: left;
  
}

.main-card${keyProp} .screen-Gkdshjgfkjdgf-container {
 
   height: 100dvh;
  
}

/* Status Bar */

.main-card${keyProp} .status-bar {
 
  height: 25px;
  background: #004e45;
  color: #fff;
  font-size: 14px;
  padding: 0 8px;
  
}

.main-card${keyProp} .status-bar:after {
 
  content: "";
  display: table;
  clear: both;
  
}

.main-card${keyProp} .status-bar div {
 
  float: right;
  position: relative;
  top: 50%;
  transform: translateY(-50%);
  margin: 0 0 0 8px;
  font-weight: 600;
  
}

/* Chat */

.main-card${keyProp} .chat {
 
  height: calc(100% - 69px);
  
}

.main-card${keyProp} .chat-container-Gkdshjgfkjdgf {
 
  height: 100%;
  
}

/* User Bar */

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf {
 
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

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf:after {
 
  content: "";
  display: table;
  clear: both;
  
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf div {
 
  float: left;
  transform: translateY(-50%);
  position: relative;
  top: 50%;
  
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf .actions-Gkdshjgfkjdgf {
 
  float: right;
  margin: 0 0 0 85px;
  display:flex;
  
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf .actions-Gkdshjgfkjdgf.more {
 
  margin: 0 12px 0 32px;
  
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf .actions-Gkdshjgfkjdgf.attachment {
 
  margin: 0 0 0 30px;
  
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf .actions-Gkdshjgfkjdgf.attachment i {
 
  display: block;
  transform: rotate(-45deg);
  
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf .avatar-Gkdshjgfkjdgf {
 
  margin: 0 0 0 5px;
  width: 50px;
  height: 50px;
  
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf .avatar-Gkdshjgfkjdgf img {
 
  border-radius: 50%;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1);
  display: block;
  width: 100%;
  
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf .name {
 
  font-size: 18px;
  font-weight: 600;
  text-overflow: ellipsis;
  letter-spacing: 0.3px;
  margin: 0 0 0 8px;
  overflow: hidden;
  white-space: nowrap;
  width: 200px;
    display: flex;
    
}

.main-card${keyProp} .user-bar-Gkdshjgfkjdgf .status {
 
  display: block;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
  
}

/* Conversation */

.main-card${keyProp} .conversation {
 
  height: 512px;
  position: relative;
   background: ${colors.checked ? '#' + colors.pgColor : 'url(' + BASE_URL + '/' + colors.pgImage + ')'};
     background-position:  ${colors.position} ;
      background-size: 100% 100%;
  z-index: 0;
  
}


.main-card${keyProp} .conversation ::-webkit-scrollbar {
 
  transition: all .5s;
  width: 5px;
  height: 1px;
  z-index: 10;
  
}

.main-card${keyProp} .conversation ::-webkit-scrollbar-track {
 
  background: #fff;
  
}

.main-card${keyProp} .conversation ::-webkit-scrollbar-thumb {
 
  background: #b3ada7;
  
}

.main-card${keyProp} .conversation .conversation-container-Gkdshjgfkjdgf {
 
  height: calc(100% -  ${suggestedMessages.length ? '60' : '60'}px);//120
  box-shadow: inset 0 10px 10px -10px #000000;
  overflow-x: auto;
  padding: 0 16px;
  margin-bottom: 5px;
  
}

.main-card${keyProp} .conversation .conversation-container-Gkdshjgfkjdgf:after {
 
  content: "";
  display: table;
  clear: both;
  
}

/* Messages */

.main-card${keyProp} .message {
 
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

.main-card${keyProp} .messageS {
 
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

.main-card${keyProp} .message:after {
 
  position: absolute;
  content: "";
  width: 0;
  height: 0;
  border-style: solid;
  
}

.main-card${keyProp} .metadata {
  display: inline-block;
  float: right;
  padding: 0 0 0 7px;
  position: relative;
  bottom: -4px;
  
}

.main-card${keyProp} .metadata .time {
  color: rgba(0, 0, 0, .45);
  font-size: 11px;
  display: inline-block;
  
}

.main-card${keyProp} .metadata .tick {
  display: inline-block;
  margin-left: 2px;
  position: relative;
  top: 4px;
  height: 16px;
  width: 16px;
  
}

.main-card${keyProp} .metadata .tick svg {
  position: absolute;
  transition: .5s ease-in-out;
  
}

.main-card${keyProp} .metadata .tick svg:first-child {
  -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
  -webkit-transform: perspective(800px) rotateY(180deg);
          transform: perspective(800px) rotateY(180deg);
          
}

.main-card${keyProp} .metadata .tick svg:last-child {
  -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
  -webkit-transform: perspective(800px) rotateY(0deg);
          transform: perspective(800px) rotateY(0deg);
}

.main-card${keyProp} .metadata .tick-animation svg:first-child {
  -webkit-transform: perspective(800px) rotateY(0);
          transform: perspective(800px) rotateY(0);
}

.main-card${keyProp} .metadata .tick-animation svg:last-child {
  -webkit-transform: perspective(800px) rotateY(-179.9deg);
          transform: perspective(800px) rotateY(-179.9deg);
}

.main-card${keyProp} .message:first-child {
  margin: 16px 0 8px;
}

.main-card${keyProp} .message.receivedltr {
 
  background: #${colors.pgReceived};
  color:#${colors.colorReceived};
  border-radius: 0px 5px 5px 5px;
  float: left;
  
}

.main-card${keyProp} .message.received .metadata {
  padding: 0 0 0 16px;
  
}

.main-card${keyProp} .message.receivedltr:after {
 
  border-width: 0px 10px 10px 0;
  border-color: transparent #${colors.pgReceived} transparent transparent;
  top: 0;
  left: -10px;
  
}

.main-card${keyProp} .message.sentltr {
 
  background: #${colors.pgSent};
  color:#${colors.colorSent};
  border-radius: 5px 0px 5px 5px;
  float: right;
  
}

.main-card${keyProp} .message.sentltr:after {
 
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

.main-card${keyProp} .conversation-compose {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  overflow: hidden;
  height: 47px;
  width: 100%;
background: #fff;
padding:5px;
  
}

.main-card${keyProp} .conversation-compose div,
.conversation-compose input {
  background: #fff;
  height: 100%;
  
}

.main-card${keyProp} .conversation-compose .emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 5px 0 0 5px;
  flex: 0 0 auto;
  margin-left: 8px;
  width: 5px;
  
}

.main-card${keyProp} .conversation-compose .input-msg {
  border: 0;
  flex: 1 1 auto;
  font-size: 16px;
  margin: 0 2px;
  outline: none;
  min-width: 50px;
  padding: 0;
  
}

.main-card${keyProp} .conversation-compose .photo {
  flex: 0 0 auto;
  border-radius: 0 0 5px 0;
  text-align: center;
  position: relative;
  width: 48px;
  
}

.main-card${keyProp} .conversation-compose .photo:after {
  border-width: 0px 0 10px 10px;
  border-color: transparent transparent transparent #fff;
  border-style: solid;
  position: absolute;
  width: 0;
  height: 0;
  content: "";
  top: 0;
  right: -10px;
  
}

.main-card${keyProp} .conversation-compose .photo i {
  display: block;
  color: #7d8488;
  font-size: 24px;
  transform: translate(-50%, -50%);
  position: relative;
  top: 50%;
  left: 50%;
  
}

.main-card${keyProp} .conversation-compose .send {
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

.main-card${keyProp} .conversation-compose .send .circle {
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

.main-card${keyProp} .conversation-compose .send .circle i {
  font-size: 24px;
  

}

/* Small screen-Gkdshjgfkjdgfs */

@media (max-width: 450px) {
  .poweredBy${keyProp}{
    position: fixed;
      bottom: 2px !important;
      right: 0px !important;
      width: 100% !important;
      background-color: white;
      z-index: 999998;
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 8px;
      box-shadow: 0 4px 1px rgba(0, 0, 0, 0.2), 0 8px 2px rgba(0, 0, 0, 0.19);
    }
  .main-card${keyProp} .marvel-device-Gkdshjgfkjdgf.nexus5-Gkdshjgfkjdgf {
    border-radius: 0;
    flex: none;
    padding: 0;
    max-width: none;
    overflow: hidden;
     height: 100%;

    width: 100%;
    
  }

  .main-card${keyProp} .marvel-device-Gkdshjgfkjdgf > .screen-Gkdshjgfkjdgf .chat {
    visibility: visible;
    
  }

 .main-card${keyProp}  .marvel-device-Gkdshjgfkjdgf {
    visibility: hidden;
    
  }

 .main-card${keyProp}  .marvel-device-Gkdshjgfkjdgf .status-bar {
    display: none;
  }

  .main-card${keyProp} .screen-Gkdshjgfkjdgf-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

 .main-card${keyProp}  .conversation {
   /* height: calc(100dvh - 90px); */
   height: calc(100dvh - 121px);
  }
 .main-card${keyProp}  .conversation .conversation-container-Gkdshjgfkjdgf {
    height: calc(100% - ${suggestedMessages.length ? '60' : '60'}px); /* 121 */
  }

}


    .main-card${keyProp} {
      background: white;
      color: white;
      width: 100%;
      height: 100dvh;
      margin: 0px;
      border-radius: 0px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      right: 0;
      bottom: 0;
      position: absolute;
      transition: all 0.5s;
      box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
      position: fixed;
      z-index: 999998
    }

 

    .line${keyProp} {
      height: 1px;
      background-color: rgb(51, 144, 153);
      width: 100%;
      opacity: 0.2;
    }

    .main-title${keyProp} {
      background-color: rgb(51, 144, 153);
      font-size: large;
      font-weight: bold;
      display: flex;
      height: 48px;
      align-items: center;
       padding-left: 9px;
    }

    .chat-area${keyProp} {
       flex-grow: 1;
      overflow: auto;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
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


    .main-card${keyProp} .popImg-Gkdshjgfkjdgf{
    width: 80px;
  height: 80px;
  border-radius: 100%;
 cursor: pointer;
   transition: all 2s ease-in-out;

    }

.main-card${keyProp} .popImg-Gkdshjgfkjdgf:hover {
  box-shadow: 0 0 0 rgba(204,169,44, 0.4);
  animation: pulse 2s infinite;
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

      .main-card${keyProp} .popDevgkdshjgfkjdgf{
position: fixed;
  bottom: 13px;
  right: 25px;
  z-index: 999999;
background-color: transparent;
  border-radius: 100%;

    }

 .main-card${keyProp} .loading {
  font-family: monospace;
  clip-path: inset(0 3ch 0 0);
  animation: l 1s steps(4) infinite;
}


 .main-card${keyProp} .suggested-messages-container {
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


  .main-card${keyProp} .suggested-message {
  color: #414346;
  background-color: #fff;      /* light gray background */
  padding: 0.5rem;                /* padding for each message */
  border-radius: 1rem;        /* rounded corners */
  white-space: nowrap;            /* keep the text on one line */
  cursor: pointer;                /* show pointer on hover */
  transition: background-color 0.3s; /* smooth hover transition */
  font-size: ${colors.fontSize}px; 
  text-align: center;
  border : 2px solid transparent;
}

.main-card${keyProp} .suggested-messages-container {
  scrollbar-width: thin;              /* Make scrollbar thinner */
  scrollbar-color: #888 #f1f1f1;      /* Thumb color (first) and track color (second) */
}

 .main-card${keyProp} .suggested-message:hover {

   border : 2px solid #d1d5db;
}

 .main-card${keyProp} #privacy-container-15645314545643sd5hgthjfgjh {
  height: 1.8rem !important;      
  background-color: #e2e8f070;   
  display: flex;                
  align-items: center;         
  padding-left: 1rem;          
  padding-right: 1rem;         
   font-size: 0.8rem;
  color: #3339;
  justify-content: center;
  position: absolute;
  z-index-2;
  width: 100%;
}

 .main-card${keyProp} #privacy-container-15645314545643sd5hgthjfgjh a {
    color:#3339;
}


 .main-card${keyProp} #privacy-container-15645314545643sd5hgthjfgjh p {
 all: unset;
}


@keyframes l {
  to {
    clip-path: inset(0 -1ch 0 0)
  }
}0% {background-position: center}
}



 .main-card${keyProp} .lds-ellipsis,
.lds-ellipsis div {
  box-sizing: border-box;
}
 .main-card${keyProp} .lds-ellipsis {
  display: inline-block;
  position: relative;
  width: 80px;
}
 .main-card${keyProp} .lds-ellipsis div {
  position: absolute;
top: -10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
 .main-card${keyProp} .lds-ellipsis div:nth-child(1) {
  left: 8px;
  animation: lds-ellipsis1 0.6s infinite;
}
 .main-card${keyProp} .lds-ellipsis div:nth-child(2) {
  left: 8px;
  animation: lds-ellipsis2 0.6s infinite;
}
 .main-card${keyProp} .lds-ellipsis div:nth-child(3) {
  left: 32px;
  animation: lds-ellipsis2 0.6s infinite;
}
 .main-card${keyProp} .lds-ellipsis div:nth-child(4) {
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





  `;

  return (
    <> {
      !loading && <>
        <style>{style}</style>
        <div className={`card${keyProp}`} style={{ position: "static " }}>
          <div className={`main-card${keyProp} ${collapsed ? `collapsed${keyProp}` : ''}`}>
            {
              collapsed &&
              <div className={`${collapsed ? 'popDevgkdshjgfkjdgf' : ''}`}>
                {isVisible && collapsed && (
                  <div
                    style={{
                      backgroundColor: 'white',
                      color: 'black',
                      boxShadow: 'rgba(150, 150, 150, 0.2) 0px 10px 30px 0px, rgba(150, 150, 150, 0.2) 0px 0px 0px 1px',
                      borderRadius: '10px',
                      padding: '20px 0',
                      margin: '0 0 20px 0',
                      fontSize: '14px',
                      opacity: 1,
                      transform: 'scale(1)',
                      transition: 'opacity 0.5s, transform 0.5s',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span onClick={toggle} style={{ padding: "20px" }}>
                      {initMessage}
                    </span>
                    {isHovered && (
                      <svg
                        onClick={hiddenInitMessage}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        width={20}
                        height={20}
                        style={{
                          position: 'absolute',
                          top: '-15px',
                          right: '-10px',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          backgroundColor: "#cbd5e1",
                          color: "#1e293b",
                          padding: "2px",
                          borderRadius: "100%",
                        }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />

                      </svg>
                    )}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'end'
                  }}
                >
                  <img
                    src={BASE_URL + image}
                    alt="avatar-Gkdshjgfkjdgf"
                    onClick={toggle}
                    className="popImg-Gkdshjgfkjdgf"
                    style={{ cursor: 'pointer' }}
                  />
                </div>

              </div>
            }


            <div className="page-Gkdshjgfkjdgf">
              <div className="marvel-device-Gkdshjgfkjdgf nexus5-Gkdshjgfkjdgf">

                <div className="screen-Gkdshjgfkjdgf">
                  <div className="screen-container-Gkdshjgfkjdgf">

                    <div className="chat">
                      <div className="chat-container-Gkdshjgfkjdgf">

                        {/* <div className="user-bar-Gkdshjgfkjdgf">
                          <div className="back">
                            {
                              colors.dir == 'rtl' &&
                              <svg onClick={toggle} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={30} height={30}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            }

                          </div>
                          <div className="avatar-Gkdshjgfkjdgf">
                            <img src={BASE_URL + image} alt="avatar-Gkdshjgfkjdgf" />
                          </div>
                          <div className="name">
                            <span>{name}</span>
                          </div>
                          <div className="actions-Gkdshjgfkjdgf" style={{ marginRight: "10px", cursor: 'pointer' }}>
                            {
                              colors.dir == 'ltr' &&
                              <svg onClick={toggle} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={30} height={30}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            }

                          </div>
                        </div> */}


                        <div className="user-bar-Gkdshjgfkjdgf">
                          <div className="back">
                            {
                              colors.dir == 'rtl' &&
                              <svg onClick={toggle} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={30} height={30}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            }

                          </div>
                          <div className="avatar-Gkdshjgfkjdgf">
                            <img src={BASE_URL + image} alt="avatar-Gkdshjgfkjdgf" />
                          </div>
                          <div className="name">
                            <span>{name}</span>
                          </div>
                          <div className="actions-Gkdshjgfkjdgf" style={{ marginRight: "10px", cursor: 'pointer' }}>
                              {
                                  colors.dir == 'ltr' &&
                                  <>
                                      <svg onClick={refresh} style={{ width: '25px', marginRight: '2px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`${isSpinning ? 'spin' : ''}`} >
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                                      </svg>
                                      <svg onClick={toggle} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={30} height={30}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                      </svg>
                                  </>
                              }

                          </div>
                        </div>
                        <div className="conversation" >
                          <div className="conversation-container-Gkdshjgfkjdgf" ref={messageEl}>
                            {messages.map((msg, index) => (
                              <div key={index} className={`message ${msg.role === 'user' ? 'sent' + colors.dir : 'received' + colors.dir}`}>
                                <span dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                              </div>
                            ))}
                            {
                              typing && <div key='typing' className={`message ${'received' + colors.dir} `}>
                                <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                              </div>
                            }

                              {suggestedMessages.length > 0 && messages.length <= 1 &&

                              <div className='messageS' style={{ marginTop: '10px' }}>

                                <p style={{ color: "#676b73" }}>Les questions les plus posées :</p>

                                {
                                  suggestedMessages.map((suggestedMessage, index) =>
                                    <span key={index} className='suggested-message' style={{ display: 'block', marginTop: "10px" }} onClick={() => Suggest(suggestedMessage)}>{suggestedMessage}</span>
                                  )
                                }
                              </div>}
                          </div>



                          <div className='suggestedMessagesDev'>
                            {/* {
                              !suggestedMessages.length ?
                                <div className='suggested-messages-container'>
                                  {
                                    suggestedMessages.map((suggestedMessage, index) =>
                                      <span key={index} className='suggested-message' onClick={() => Suggest(suggestedMessage)}>{suggestedMessage}</span>
                                    )
                                  }
                                </div> : ''
                            } */}
                          </div>





                          <form onSubmit={send}>


                            <div className='conversation-compose'>
                              <input className="input-msg" name="input" placeholder={placeholder} autoComplete="off" value={message} onChange={handleChange} autoFocus></input>

                              <button className="send" disabled={typing}>
                                <div className="circle">

                                  <svg xmlns="http://www.w3.org/2000/svg" strokeWidth={1.5} width={28} fill="none" viewBox="0 0 20 20">
                                    <path fill="currentColor" d="M15.44 1.68c.69-.05 1.47.08 2.13.74.66.67.8 1.45.75 2.14-.03.47-.15 1-.25 1.4l-.09.35a43.7 43.7 0 0 1-3.83 10.67A2.52 2.52 0 0 1 9.7 17l-1.65-3.03a.83.83 0 0 1 .14-1l3.1-3.1a.83.83 0 1 0-1.18-1.17l-3.1 3.1a.83.83 0 0 1-.99.14L2.98 10.3a2.52 2.52 0 0 1 .04-4.45 43.7 43.7 0 0 1 11.02-3.9c.4-.1.92-.23 1.4-.26Z"></path></svg>
                                </div>
                              </button>
                            </div>

                          </form>
                        </div>

                        <div id='privacy-container-15645314545643sd5hgthjfgjh' dangerouslySetInnerHTML={{ __html: privacy }} />

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>




          </div>
          {
            !collapsed &&
            <div className={`poweredBy${keyProp}`}>
                <a style={{ display: 'flex', justifyContent: 'center', width: '100%', backgroundColor: '#e2e8f070' }} href={`https://dialogease.com?utm_campaign=${window.location.hostname}&utm_source=powered-by&utm_medium=chatbot`} target='_blank' rel="noopener noreferrer">
                <img src={BASE_URL + '/images/logo.png'} style={{ width: '100px' }} />
              </a>
            </div>
          }

        </div>
      </>
    }

    </>
  );
}

export default App;