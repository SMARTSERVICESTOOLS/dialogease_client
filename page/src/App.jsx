import React, { useEffect, useState, useRef } from 'react';
import { BASE_URL } from './base';
import DOMPurify from 'dompurify';
import Api from './Api';

function App({ keyProp, id }) {
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
  const [suggestedMessages, setSuggestedMessages] = useState([]);
  const [privacy, setPrivacy] = useState('');
  const elementRef = useRef(null);
  const [height, setHeight] = useState(0);

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };




  // useEffect(() => {
  //   const handleScroll = (event) => {
  //     const { currentTarget: target } = event;
  //     target.scroll({ top: target.scrollHeight, behavior: 'auto' });
  //   };

  //   const currentMessageEl = messageEl.current;
  //   if (currentMessageEl) {
  //     currentMessageEl.addEventListener('DOMNodeInserted', handleScroll);
  //   }

  //   // Cleanup on component unmount
  //   return () => {
  //     if (currentMessageEl) {
  //       currentMessageEl.removeEventListener('DOMNodeInserted', handleScroll);
  //     }
  //   };
  // }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (message.trim()) {
      let idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      if (!idConversation) {
        await createConversations();
        idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      }

      try {
        setMessages((prevMessages) => [...prevMessages, { role: 'user', content: message }]);
        const msg = message;
        setMessage('');
        setTimeout(() => {
          setTyping(true);
        }, 1000);

        const response = await Api.post(`sendMessage`, { idConversation, message: msg, role: 'user', keyProp });
        setMessages(response.data.data.message.original.messages);
        setTyping(false);
        playAudio();
      } catch (error) {
        console.error('Error sending message:', error);
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

      const url = window.location.href;
      const response = await Api.post(`createConversation`, { chat_id: keyProp, url });
      sessionStorage.setItem('jsqhgdhshziqjlyruizeyryyueg', response.data.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };



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
      setName(response.data.name);
      setImage(response.data.image);

      setSuggestedMessages(response.data.suggested_messages ?? []);
      setPrivacy(response.data.message_privacy);

      setLoading(false);

      const idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      if (!idConversation) {
        setMessages([{ role: 'assistant', content: response.data.init_message }]);
      }

      setPlaceholder(response.data.placeholder);
    });
  };


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
    if (!typing) {
      let idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      if (!idConversation) {
        await createConversations();
        idConversation = sessionStorage.getItem('jsqhgdhshziqjlyruizeyryyueg');
      }

      try {
        setMessages((prevMessages) => [...prevMessages, { role: 'user', content: msg }]);
        setTimeout(() => {
          setTyping(true);
        }, 1000);

        const response = await Api.post(`sendMessage`, { idConversation, message: msg, role: 'user', keyProp });
        setMessages(response.data.data.message.original.messages);
        setTyping(false);
        playAudio();
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const formatContent = (content) => {
    let formattedContent = content.replace(/\n/g, '<br />');
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    formattedContent = formattedContent.replace(/(?:\*{1}(.*?)\*{1}|_{1}(.*?)_{1})/g, (match, p1, p2) => {
      return `<i>${p1 || p2}</i>`;
    });
    formattedContent = formattedContent.replace(/~~(.*?)~~/g, '<del>$1</del>');
    formattedContent = formattedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="a-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    formattedContent = formattedContent.replace(/`(.*?)`/g, '<code>$1</code>');

    return DOMPurify.sanitize(formattedContent);
  };


  function calcY(x) {
    return -0.1 * x + 90;
  }



  useEffect(() => {

    let ele = document.getElementById(id);

    // If elementRef is valid
    if (elementRef.current) {
      const elementHeight = elementRef.current.getBoundingClientRect().height;

      // Set a minimum height of 600px if the current height is less
      if (elementHeight < 600) {
        ele.style.height = '600px';
      }

      // Calculate the height (this will reflect after applying the min height)
      const newHeight = elementRef.current.getBoundingClientRect().height;
      setHeight(calcY(newHeight));
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
  width: 100%;
background: #fff;
padding:5px;
  
}

.main-card-iframe-${keyProp} .conversation-compose div,
.conversation-compose input {
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
      max-width: 400px;
      max-height: 600px;
      margin: 0px;
      border-radius: 0 0 5px 5px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 10px 16px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
    }

 @media (min-width: 450px) {
   .main-card-iframe-${keyProp} {
      width: 450px;
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
  height: 1.8rem !important;      
  background-color: #e2e8f070;   
  display: flex;                
  align-items: center;         
  padding-left: 1rem;          
  padding-right: 1rem;         
  font-size: 0.8rem;
  color: #3339;
  justify-content: center;
  width: 97%;
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
                        <div className="user-bar-Gkdshjgfkjdgf">
                          <div className="back">

                          </div>
                          <div className="avatar-Gkdshjgfkjdgf">
                            <img src={BASE_URL + image} alt="avatar-Gkdshjgfkjdgf" />
                          </div>
                          <div className="name">
                            <span>{name}</span>
                          </div>
                          <div className="actions-Gkdshjgfkjdgf" style={{ marginRight: "10px", cursor: 'pointer' }}>

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

                            {suggestedMessages.length && messages.length <= 1 &&

                              <div className='messageS' style={{ marginTop: '10px' }}>

                                <p style={{ color: "black" }}>Les questions les plus posées :</p>

                                {
                                  suggestedMessages.map((suggestedMessage, index) =>
                                    <span key={index} className='suggested-message' style={{ display: 'block', marginTop: "10px" }} onClick={() => Suggest(suggestedMessage)}>{suggestedMessage}</span>
                                  )
                                }
                              </div>}

                          </div>

                          <div className='suggestedMessagesDev'>
                            {
                              // suggestedMessages.length ?
                              //   <div className='suggested-messages-container'>
                              //     {
                              //       suggestedMessages.map((suggestedMessage, index) =>
                              //         <span key={index} className='suggested-message' onClick={() => Suggest(suggestedMessage)}>{suggestedMessage}</span>
                              //       )
                              //     }
                              //   </div> : ''
                            }
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

            <div style={{ display: 'flex', justifyContent: 'center', width: '400px' ,marginTop:'10px' }}>
              <a href={`https://dialogease.com?utm_campaign=${window.location.hostname}&utm_source=powered-by&utm_medium=chatbot`} target='_blank' rel="noopener noreferrer">
                <img src={BASE_URL + '/images/logo.png'} style={{ width: '100px' }} />
              </a>
            </div>
            
          </div>

        </div>
      </>
    }

    </>
  );
}

export default App;
