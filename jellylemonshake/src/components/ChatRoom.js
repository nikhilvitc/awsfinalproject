import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import MessageItem from "./MessageItem";
import MeetingScheduler from "./MeetingScheduler";
import InstantMeet from "./InstantMeet";
import AdminPanel from "./AdminPanel";
import MeetingsList from "./MeetingsList";
import { useAuth } from "./AuthContext";
import socketService from "../services/socketService";
import "../styles/components/ChatRoom.css";
import EmojiPicker from 'emoji-picker-react';

function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    console.log('ChatRoom: Authentication check - isAuthenticated:', isAuthenticated, 'authUser:', authUser);
    if (!isAuthenticated) {
      console.log('ChatRoom: User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Helper function to get user identifier consistently
  const getUserIdentifier = () => {
    return authUser?.email || authUser?.username || 'Anonymous';
  };

  const getDisplayUsername = () => {
    // First check if user has a stored username
    if (authUser?.username && authUser.username !== authUser.email) {
      return authUser.username;
    }
    
    // If no username, extract from email (part before @)
    if (authUser?.email) {
      return authUser.email.split('@')[0];
    }
    
    // Fallback to stored username or Anonymous
    return authUser?.username || 'Anonymous';
  };

  // [All state variables and refs remain the same]
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [participants, setParticipants] = useState([]);
  const [roomInfo, setRoomInfo] = useState(null);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [expandedRooms, setExpandedRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allRoomsParticipants, setAllRoomsParticipants] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [taggedMessage, setTaggedMessage] = useState(null);
  const [isAttachmentOn, setIsAttachmentOn] = useState(false);
  const [isEmojiOn, setIsEmojiOn] = useState(false);
  const [isCodeOn, setIsCodeOn] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messagesUpdated, setMessagesUpdated] = useState(false);
  // Drag and drop states
  const [draggedRoom, setDraggedRoom] = useState(null);
  const [dragOverRoom, setDragOverRoom] = useState(null);
  // Enhanced drag and drop states for animations
  const [draggedItemRect, setDraggedItemRect] = useState(null);
  const [roomOrder, setRoomOrder] = useState([]);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [dragDirection, setDragDirection] = useState(null);
  // Code language states
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  // Mention feature states
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStartPosition, setMentionStartPosition] = useState(null);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  // New state for unread message counts
  const [unreadCounts, setUnreadCounts] = useState({});
  // Room saving states
  const [isRoomSaved, setIsRoomSaved] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  // User dropup menu state
  const [userDropupOpen, setUserDropupOpen] = useState(false);
  // Search feature states
  const [highlightedMessageIds, setHighlightedMessageIds] = useState([]);
  const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Add this new state for scroll button animation
  const [scrollButtonHiding, setScrollButtonHiding] = useState(false);
  // Add these new states for animation controls
  const [emojiPickerHiding, setEmojiPickerHiding] = useState(false);
  const [languageSelectorHiding, setLanguageSelectorHiding] = useState(false);
  const [taggedMessageHiding, setTaggedMessageHiding] = useState(false);
  // Add at the top with other useState imports
  const [executionMode, setExecutionMode] = useState(false);
  const [codeToRun, setCodeToRun] = useState("");
  const [runLanguage, setRunLanguage] = useState("javascript");
  const [runOutput, setRunOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [showInstantMeet, setShowInstantMeet] = useState(false);
  
  // Socket.IO states
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Admin panel states
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // Meetings states
  const [showMeetingsList, setShowMeetingsList] = useState(false);

  // [All refs and constant declarations remain the same]
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const participantRefs = useRef({});
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messageInputRef = useRef(null);
  const languageSelectorRef = useRef(null);
  const mentionListRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const prevMessageCountsRef = useRef({});
  const userMenuRef = useRef(null);
  const searchContainerRef = useRef(null);
  const roomsListRef = useRef(null);
  //const messagePollingRef = useRef(null);

  // Supported coding languages
  const codeLanguages = [
    { id: "javascript", name: "JavaScript" },
    { id: "python", name: "Python" },
    { id: "java", name: "Java" },
    { id: "cpp", name: "C++" },
    { id: "csharp", name: "C#" },
    { id: "php", name: "PHP" },
    { id: "ruby", name: "Ruby" },
    { id: "swift", name: "Swift" },
    { id: "go", name: "Go" },
    { id: "typescript", name: "TypeScript" },
    { id: "html", name: "HTML" },
    { id: "css", name: "CSS" },
  ];

  // Update roomOrder when joinedRooms changes
  useEffect(() => {
    if (joinedRooms.length > 0) {
      setRoomOrder(joinedRooms.map((room) => room.roomId));
    }
  }, [joinedRooms]);

  // Search feature functions
  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prevIsOpen) => {
      if (prevIsOpen) {
        // Clear search when closing
        setSearchQuery("");
        setSearchResults([]);
        setHighlightedMessageIds([]);
      }
      return !prevIsOpen;
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !event.target.closest(".emoji-button") // Use closest instead of classList.contains
      ) {
        setShowEmojiPicker(false);
        setIsEmojiOn(false);
      }

      if (
        isSearchOpen &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target) &&
        !event.target.closest(".search-button")
      ) {
        toggleSearch();
      }
    }

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchOpen, toggleSearch]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      const results = messages.filter((message) =>
        message.text.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);

      // Extract all matching message IDs
      const matchingIds = results.map(
        (message) => message.id || new Date(message.timestamp).getTime()
      );
      setHighlightedMessageIds(matchingIds);

      // Reset to first result
      setCurrentSearchResultIndex(0);

      // If there are results, scroll to the first one
      if (results.length > 0) {
        scrollToMessage(results[0]);
      }
    } else {
      setSearchResults([]);
      setHighlightedMessageIds([]);
    }
  };

  const navigateSearchResults = (direction) => {
    if (searchResults.length <= 1) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (currentSearchResultIndex + 1) % searchResults.length;
    } else {
      newIndex =
        (currentSearchResultIndex - 1 + searchResults.length) %
        searchResults.length;
    }

    setCurrentSearchResultIndex(newIndex);
    scrollToMessage(searchResults[newIndex]);
  };

  const scrollToMessage = (message) => {
    const messageId = message.id || new Date(message.timestamp).getTime();

    setTimeout(() => {
      const messageElements =
        messagesContainerRef.current.querySelectorAll(".message-item");
      const matchIndex = messages.findIndex(
        (m) => (m.id || new Date(m.timestamp).getTime()) === messageId
      );

      if (matchIndex >= 0 && messageElements[matchIndex]) {
        messageElements[matchIndex].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  };

  // Check if room is saved for this user
  useEffect(() => {
    if (isAuthenticated && roomId) {
      const savedRooms = JSON.parse(localStorage.getItem("savedRooms") || "[]");
      const roomExists = savedRooms.some((room) => room.id === roomId);
      setIsRoomSaved(roomExists);
    }
  }, [isAuthenticated, roomId]);

  // Socket.IO connection and real-time chat functionality
  useEffect(() => {
    if (!authUser || !roomId) return;

    // Load existing messages first
    const loadMessages = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
        console.log('Loading messages for room:', roomId);
        
        const response = await fetch(`${apiUrl}/api/rooms/${roomId}/messages?username=${authUser?.username || authUser?.email}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const existingMessages = await response.json();
          console.log('Loaded messages:', existingMessages.length);
          setMessages(Array.isArray(existingMessages) ? existingMessages : []);
        } else if (response.status === 404) {
          // Room doesn't exist yet, create it and start with empty messages
          console.log('Room not found, creating room...');
          await createRoomIfNeeded();
          setMessages([]);
        } else {
          // For server errors, try to create room and continue
          console.warn('Server error loading messages, creating room as fallback...');
          await createRoomIfNeeded();
          setMessages([]);
        }
      } catch (error) {
        console.error('Network error loading messages:', error);
        // Network error - still try to create room and continue with empty messages
        try {
          await createRoomIfNeeded();
        } catch (createError) {
          console.error('Also failed to create room:', createError);
        }
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    const createRoomIfNeeded = async () => {
      try {
        // Check if user is authenticated before creating room
        if (!isAuthenticated || !authUser) {
          console.log('User not authenticated, cannot create room');
          return;
        }
        
        const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
        const userIdentifier = getUserIdentifier();
        console.log('Creating room:', roomId, 'for user:', userIdentifier);
        
        const response = await fetch(`${apiUrl}/api/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            name: roomId,
            createdBy: userIdentifier,
            isPrivate: false,
            color: '#007bff',
            admins: [userIdentifier],
            participants: [{
              username: userIdentifier,
              color: '#007bff',
              isCreator: true,
              isAdmin: true,
              permissions: {
                canDeleteMessages: true,
                canRemoveMembers: true,
                canManageAdmins: true,
                canEditRoomSettings: true
              }
            }]
          }),
        });

        if (response.ok) {
          const roomData = await response.json();
          console.log('Room created/joined successfully:', roomData.name);
        } else {
          console.warn('Failed to create room:', response.status);
        }
      } catch (error) {
        console.error('Error creating room:', error);
        // Don't throw - let the app continue even if room creation fails
      }
    };

    // Load messages and connect to Socket.IO
    loadMessages();

    // Connect to Socket.IO
    console.log('🔌 Initializing Socket.IO connection...');
    socketService.connect();
    setSocketConnected(socketService.isConnected());

    // Join the room
    const userIdentifier = getUserIdentifier();
    console.log('🏠 Joining room:', roomId, 'as user:', userIdentifier);
    const userForSocket = {
      username: userIdentifier,
      email: authUser.email,
      name: authUser.name,
      color: authUser.color || '#007bff'
    };
    socketService.joinRoom(roomId, userForSocket);

    // Set up event listeners
    socketService.onNewMessage((message) => {
      console.log('📨 New message received via Socket.IO:', message);
      console.log('📨 Current room:', roomId, '| Message room:', message.room);
      
      setMessages(prevMessages => {
        // Check if message already exists to prevent duplicates
        const messageExists = prevMessages.some(msg => msg._id === message._id || msg.id === message._id);
        if (messageExists) {
          console.log('Message already exists, skipping duplicate');
          return prevMessages;
        }
        
        // Ensure message has proper format
        const formattedMessage = {
          ...message,
          id: message._id || message.id || Date.now().toString(),
          user: message.user || message.sender,
          sender: message.user || message.sender,
          senderName: message.user || message.sender,
          timestamp: message.createdAt || message.timestamp || new Date().toISOString(),
          isCode: !!(message.code || message.language)
        };
        
        console.log('💬 Adding formatted message:', formattedMessage);
        
        // Add new message
        const updatedMessages = [...prevMessages, formattedMessage];
        
        // Also store in localStorage for persistence
        const allMessages = JSON.parse(localStorage.getItem("chatMessages") || "{}");
        allMessages[roomId] = updatedMessages;
        localStorage.setItem("chatMessages", JSON.stringify(allMessages));
        
        return updatedMessages;
      });
    });

    socketService.onUserJoined((data) => {
      console.log('User joined:', data.user.username || data.user.email);
    });

    socketService.onUserLeft((data) => {
      console.log('User left:', data.user.username || data.user.email);
    });

    socketService.onRoomUsers((users) => {
      setOnlineUsers(users);
    });

    socketService.onUsersCount((count) => {
      setOnlineUsersCount(count);
    });

    socketService.onUserTyping((data) => {
      setTypingUsers(prevTyping => {
        const newTyping = new Set(prevTyping);
        if (data.isTyping) {
          newTyping.add(data.user);
        } else {
          newTyping.delete(data.user);
        }
        return newTyping;
      });
      
      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prevTyping => {
          const newTyping = new Set(prevTyping);
          newTyping.delete(data.user);
          return newTyping;
        });
      }, 3000);
    });

    socketService.onError((error) => {
      console.error('Socket error:', error);
      console.error('Socket error details:', JSON.stringify(error, null, 2));
      console.error('Socket error message:', error.message);
      console.error('Socket error type:', typeof error);
      setError('Connection error: ' + (error.message || 'Unknown error'));
    });

    // Cleanup on unmount or room change
    return () => {
      if (authUser && roomId) {
        const userForSocket = {
          username: getUserIdentifier(),
          email: authUser.email,
          name: authUser.name,
          color: authUser.color || '#007bff'
        };
        socketService.leaveRoom(roomId, userForSocket);
      }
      socketService.removeAllListeners();
    };
  }, [authUser, roomId]);

  // Handle Socket.IO connection status
  useEffect(() => {
    let connectionCheckInterval;
    let reconnectTimeout;
    
    const checkAndReconnect = () => {
      const isConnected = socketService.isConnected();
      console.log('🔄 Socket connection status check:', isConnected);
      setSocketConnected(isConnected);
      
      if (!isConnected && authUser && roomId) {
        console.log('⚠️ Socket disconnected, attempting to reconnect...');
        
        // Clear existing timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        
        // Try to reconnect after a delay
        reconnectTimeout = setTimeout(() => {
          try {
            socketService.connect();
            // Rejoin room after reconnection
            setTimeout(() => {
              if (socketService.isConnected()) {
                const userForSocket = {
                  username: getUserIdentifier(),
                  email: authUser.email,
                  name: authUser.name,
                  color: authUser.color || '#007bff'
                };
                socketService.joinRoom(roomId, userForSocket);
              }
            }, 1000);
          } catch (error) {
            console.error('Failed to reconnect:', error);
          }
        }, 2000);
      }
    };
    
    // Check connection less frequently to reduce spam
    connectionCheckInterval = setInterval(checkAndReconnect, 10000); // Check every 10 seconds
    
    // Initial check
    checkAndReconnect();

    return () => {
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [authUser, roomId]);

  // Handle clicks outside the user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserDropupOpen(false);
      }
    };

    if (userDropupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userDropupOpen]);

  // User menu logout handler
  const handleMenuLogout = () => {
    logout();
    navigate("/");
  };

  // Toggle room saving
  const toggleSaveRoom = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    const savedRooms = JSON.parse(localStorage.getItem("savedRooms") || "[]");

    if (isRoomSaved) {
      const updatedRooms = savedRooms.filter((room) => room.id !== roomId);
      localStorage.setItem("savedRooms", JSON.stringify(updatedRooms));
      setIsRoomSaved(false);
    } else {
      const newRoom = {
        id: roomId,
        name: roomInfo?.name || `Room #${roomId}`,
        lastActive: new Date().toISOString(),
      };
      localStorage.setItem(
        "savedRooms",
        JSON.stringify([...savedRooms, newRoom])
      );
      setIsRoomSaved(true);
    }
  };

  // Function to get a contrasting text color based on background color
  const getContrastingColor = (backgroundColor) => {
    // Convert to hex if it's a CSS variable
    if (backgroundColor.startsWith("var(")) {
      return "#FFFFFF"; // Default to white for CSS variables
    }

    // Remove # if present
    const hex = backgroundColor.replace(/^#/, "");

    // Handle shorthand hex
    const rgb =
      hex.length === 3
        ? [
            parseInt(hex[0] + hex[0], 16),
            parseInt(hex[1] + hex[1], 16),
            parseInt(hex[2] + hex[2], 16),
          ]
        : [
            parseInt(hex.substr(0, 2), 16),
            parseInt(hex.substr(2, 2), 16),
            parseInt(hex.substr(4, 2), 16),
          ];

    // Calculate luminance - determines if color is light or dark
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance > 0.5 ? "#333333" : "#FFFFFF";
  };

  // Updated function to adjust textarea height with scrollbar handling
  const adjustTextareaHeight = () => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    // Reset height to calculate proper scrollHeight
    textarea.style.height = "auto";

    // Set new height based on content
    const newHeight = textarea.scrollHeight;
    textarea.style.height = `${newHeight}px`;

    // Only show scrollbar when content exceeds max-height (120px)
    if (newHeight > 120) {
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.overflowY = "hidden";
    }
  };

  // Auto-resize textarea when content changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [messageInput]);

  // IMPROVED: Function to handle scroll events with better threshold
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;

    // Increase threshold to 100 pixels for more natural detection of "at bottom"
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;

    setIsAtBottom(atBottom);
    // Handle button visibility with animation
    if (!atBottom && !showScrollButton) {
      setShowScrollButton(true);
      setScrollButtonHiding(false);
    } else if (atBottom && showScrollButton) {
      setScrollButtonHiding(true);
      setTimeout(() => {
        setShowScrollButton(false);
        setScrollButtonHiding(false);
      }, 300); // Duration of the hide animation
    }
  };

  // Function to scroll to bottom manually
  const scrollToBottom = () => {
    setScrollButtonHiding(true);
    setTimeout(() => {
      setShowScrollButton(false);
      setScrollButtonHiding(false);
    }, 300);

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
  };

  // Function to generate random color
  const generateRandomColor = () => {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    );
  };

  // Function to generate room color palette
  const generateRoomPalette = (baseColor) => {
    // Convert hex to RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Generate a lighter shade for backgrounds
    const lighterShade = `rgba(${r}, ${g}, ${b}, 0.1)`;

    // Generate a darker shade for accents
    const darkerShade = `rgba(${r}, ${g}, ${b}, 0.8)`;

    // Generate a mid shade for borders
    const midShade = `rgba(${r}, ${g}, ${b}, 0.5)`;

    return {
      baseColor,
      lighterShade,
      darkerShade,
      midShade,
    };
  };

  // Enhanced drag start function
  const handleDragStart = (e, roomId, index) => {
    // Store initial position for animation
    const rect = e.currentTarget.getBoundingClientRect();
    setDraggedItemRect(rect);
    setDragStartIndex(index);

    // Create a ghost element for better dragging visuals
    const ghost = e.currentTarget.cloneNode(true);
    ghost.style.position = "absolute";
    ghost.style.top = "-1000px";
    ghost.style.opacity = "0";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);

    // Clean up ghost element after drag starts
    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);

    // Set data for drag operation
    e.dataTransfer.setData("text/plain", roomId);
    e.currentTarget.classList.add("dragging");
    setDraggedRoom(roomId);
  };

  // Improved drag over handler with real-time reordering
  const handleDragOver = (e, roomId, index) => {
    e.preventDefault();

    if (draggedRoom === roomId) return;

    setDragOverRoom(roomId);

    // Determine drag direction (up or down)
    if (dragStartIndex !== null) {
      const newDirection = index > dragStartIndex ? "down" : "up";
      if (newDirection !== dragDirection) {
        setDragDirection(newDirection);
      }
    }

    // Preview new order immediately for animation
    const currentItems = [...roomOrder];
    const draggedIndex = currentItems.indexOf(draggedRoom);

    if (draggedIndex !== -1 && draggedIndex !== index) {
      // Remove from current position
      currentItems.splice(draggedIndex, 1);
      // Insert at new position
      currentItems.splice(index, 0, draggedRoom);

      // Update the preview order immediately for animation
      setRoomOrder(currentItems);
    }
  };

  // Enhanced drop handler
  const handleDrop = (e, targetRoomId) => {
    e.preventDefault();
    const sourceRoomId = e.dataTransfer.getData("text/plain");

    // Use the current preview order to make the change permanent
    const newRooms = joinedRooms.slice();
    // Sort the rooms according to the new order
    newRooms.sort((a, b) => {
      const indexA = roomOrder.indexOf(a.roomId);
      const indexB = roomOrder.indexOf(b.roomId);
      return indexA - indexB;
    });

    // Update state and localStorage
    setJoinedRooms(newRooms);
    localStorage.setItem("joinedRooms", JSON.stringify(newRooms));

    // Reset drag states
    setDraggedRoom(null);
    setDragOverRoom(null);
    setDraggedItemRect(null);
    setDragStartIndex(null);
    setDragDirection(null);
  };

  // Improved drag end handler
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove("dragging");

    // Reset to original order if drag operation was canceled
    if (draggedRoom) {
      const originalOrder = joinedRooms.map((room) => room.roomId);
      setRoomOrder(originalOrder);
    }

    // Reset all drag states
    setDraggedRoom(null);
    setDragOverRoom(null);
    setDraggedItemRect(null);
    setDragStartIndex(null);
    setDragDirection(null);
  };

  // Mock message polling interval
  const messagePollingRef = useRef(null);

  // FIXED: Handle mention input detection
  const handleMentionDetection = (text, cursorPosition) => {
    // If there's no text or no @ in the text at all, hide the mention list
    if (!text || !text.includes("@")) {
      setShowMentionList(false);
      return;
    }

    // Get the text up to the cursor position
    const textToCursor = text.substring(0, cursorPosition);

    // Use regex to find an ongoing mention
    // This matches @ preceded by start of text or whitespace,
    // followed by any non-whitespace characters, up to the end of the string
    const mentionRegex = /(^|\s)@(\S*)$/;
    const match = textToCursor.match(mentionRegex);

    if (!match) {
      // No ongoing mention found at the cursor position
      setShowMentionList(false);
      return;
    }

    // We found an ongoing mention
    const mentionStart = match.index + (match[1] || "").length; // Account for potential whitespace
    const mentionText = match[2]; // Text after @ without the @ itself

    setMentionStartPosition(mentionStart);
    setMentionFilter(mentionText);

    // Filter participants based on the mention text
    const filtered = participants.filter((participant) =>
      participant.username.toLowerCase().includes(mentionText.toLowerCase())
    );

    setFilteredParticipants(filtered);
    setShowMentionList(filtered.length > 0);
  };

  // Handle selecting a user from mention list
  const handleSelectMention = (username) => {
    if (mentionStartPosition === null) return;

    const beforeMention = messageInput.substring(0, mentionStartPosition);
    const afterMention = messageInput.substring(
      messageInputRef.current.selectionStart
    );

    // Insert the username with a space after it
    const newText = `${beforeMention}@${username} ${afterMention}`;
    setMessageInput(newText);

    // Close mention list
    setShowMentionList(false);

    // Focus back on input and place cursor after the mention
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        const newCursorPos = mentionStartPosition + username.length + 2; // +2 for @ and space
        messageInputRef.current.selectionStart = newCursorPos;
        messageInputRef.current.selectionEnd = newCursorPos;
      }
    }, 0);
  };

  // Handle language selection for code formatting
  const handleLanguageSelect = (langId) => {
    setSelectedLanguage(langId);
    setShowLanguageSelector(false);
  };

  // Initialize room data from localStorage
  useEffect(() => {
    const initializeRoom = async () => {
      const userData = localStorage.getItem("chatUser");

      if (!userData) {
        navigate("/");
        return;
      }

      const parsedUser = JSON.parse(userData);

      // Assign a random color to the user if they don't have one
      if (!parsedUser.color) {
        parsedUser.color = generateRandomColor();
        localStorage.setItem("chatUser", JSON.stringify(parsedUser));
      }

      if (parsedUser.roomId !== roomId) {
        // Update the active room
        localStorage.setItem(
          "chatUser",
          JSON.stringify({
            ...parsedUser,
            roomId,
          })
        );
      }

      setUser(parsedUser);

      // Get all joined rooms
      const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
      setJoinedRooms(userRooms);

      // Get room data from localStorage first
      const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
      let room = rooms[roomId];

      // If not found in localStorage, try to fetch from backend
      if (!room) {
        console.log('Room not found in localStorage, checking backend...');
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
          const response = await fetch(`${apiUrl}/api/rooms/${roomId}?username=${authUser?.username || authUser?.email}`);
          
          if (response.ok) {
            const roomData = await response.json();
            room = {
              id: roomId,
              name: roomData.name,
              createdBy: roomData.createdBy,
              isPrivate: roomData.isPrivate || false,
              password: roomData.password,
              participants: roomData.participants || [],
              color: roomData.color || generateRandomColor()
            };
            console.log('Room found in backend:', room);
            
            // Save to localStorage for future use
            rooms[roomId] = room;
            localStorage.setItem("chatRooms", JSON.stringify(rooms));
          } else {
            console.log('Room not found in backend either');
          }
        } catch (error) {
          console.error('Error fetching room from backend:', error);
        }
      }

      if (!room) {
        setError("Room not found. The room may have been deleted or the PIN is incorrect.");
        setLoading(false);
        return;
      }

      // Assign a random color to the room if it doesn't have one
      if (!room.color) {
        room.color = generateRandomColor();
        rooms[roomId] = room;
        localStorage.setItem("chatRooms", JSON.stringify(rooms));
      }

      setRoomInfo(room);
      // Use unique participants if available, otherwise fall back to regular participants
      setParticipants(room.uniqueParticipants || room.participants || []);
      
      // Check if current user is admin
      const currentUsername = getUserIdentifier();
      const displayUsername = getDisplayUsername();
      const isAdmin = room.createdBy === currentUsername || 
                     room.createdBy === displayUsername ||
                     (room.admins && (room.admins.includes(currentUsername) || room.admins.includes(displayUsername))) ||
                     (room.participants && room.participants.some(p => 
                       (p.username === currentUsername || p.username === displayUsername) && p.isAdmin
                     ));
      console.log('Admin check:', {
        currentUsername,
        createdBy: room.createdBy,
        admins: room.admins,
        isAdmin
      });
      setIsUserAdmin(isAdmin);

      // Get participants for all rooms
      const roomParticipantsMap = {};
      userRooms.forEach((userRoom) => {
        const currentRoom = rooms[userRoom.roomId];
        if (currentRoom) {
          // Use unique participants if available, otherwise fall back to regular participants
          roomParticipantsMap[userRoom.roomId] = currentRoom.uniqueParticipants || currentRoom.participants || [];
        }
      });
      setAllRoomsParticipants(roomParticipantsMap);

      // Get messages for this room - first check localStorage, then backend
      let roomMessages = [];
      const allMessages = JSON.parse(
        localStorage.getItem("chatMessages") || "{}"
      );
      const localMessages = allMessages[roomId] || [];

      // If no local messages or very few, try to fetch from backend
      if (localMessages.length === 0) {
        console.log('No local messages found, fetching from backend...');
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
          const messagesResponse = await fetch(`${apiUrl}/api/rooms/${roomId}/messages?username=${authUser?.username || authUser?.email}`);
          
          if (messagesResponse.ok) {
            const backendMessages = await messagesResponse.json();
            console.log('Fetched', backendMessages.length, 'messages from backend');
            
            if (backendMessages.length > 0) {
              // Convert backend messages to frontend format
              roomMessages = backendMessages.map(msg => ({
                id: msg._id,
                _id: msg._id,
                text: msg.text || '',
                code: msg.code || '',
                language: msg.language || '',
                output: msg.output || '',
                user: msg.user,
                timestamp: msg.createdAt || new Date().toISOString(),
                createdAt: msg.createdAt || new Date().toISOString(),
                room: roomId,
                isCode: !!(msg.code || msg.language),
                sender: msg.user, // Add for compatibility
                senderName: msg.user // Add for compatibility
              }));
              
              // Save to localStorage for future use
              allMessages[roomId] = roomMessages;
              localStorage.setItem("chatMessages", JSON.stringify(allMessages));
              console.log('Messages saved to localStorage');
            }
          } else {
            console.log('No messages found in backend for this room');
            roomMessages = localMessages;
          }
        } catch (error) {
          console.error('Error fetching messages from backend:', error);
          roomMessages = localMessages; // Fallback to local messages
        }
      } else {
        console.log('Using', localMessages.length, 'local messages');
        roomMessages = localMessages;
      }

      setMessages(roomMessages);
      prevMessagesLengthRef.current = roomMessages.length;

      // Initialize previous message counts for each room for unread tracking
      const prevCounts = {};
      userRooms.forEach((userRoom) => {
        const roomMessages = allMessages[userRoom.roomId] || [];
        prevCounts[userRoom.roomId] = roomMessages.length;
      });
      prevMessageCountsRef.current = prevCounts;

      setLoading(false);

      // Set up polling for new messages and participants (simulating real-time)
      messagePollingRef.current = setInterval(() => {
        const updatedMessages =
          JSON.parse(localStorage.getItem("chatMessages") || "{}")[roomId] || [];

        // IMPROVED: Check for new messages and set flag instead of directly scrolling
        if (updatedMessages.length > prevMessagesLengthRef.current) {
          setMessages(updatedMessages);
          prevMessagesLengthRef.current = updatedMessages.length;
          setMessagesUpdated(true);
        }

        // Check for new messages in other rooms and track unread counts
        const allMessages = JSON.parse(
          localStorage.getItem("chatMessages") || "{}"
        );
        joinedRooms.forEach((room) => {
          if (room.roomId !== roomId) {
            // Only for rooms other than current
            const roomMessages = allMessages[room.roomId] || [];
            const prevCount = prevMessageCountsRef.current[room.roomId] || 0;

            if (roomMessages.length > prevCount) {
              // Increment unread count by the number of new messages
              setUnreadCounts((prev) => ({
                ...prev,
                [room.roomId]:
                  (prev[room.roomId] || 0) + (roomMessages.length - prevCount),
              }));

              // Update the previous count reference
              prevMessageCountsRef.current = {
                ...prevMessageCountsRef.current,
                [room.roomId]: roomMessages.length,
              };
            }
          }
        });

        // Update participants for all rooms
        const updatedRooms = JSON.parse(
          localStorage.getItem("chatRooms") || "{}"
        );

        // Update active room participants
        const updatedRoom = updatedRooms[roomId];
        if (
          updatedRoom &&
          JSON.stringify(updatedRoom.participants) !==
            JSON.stringify(participants)
        ) {
          setParticipants(updatedRoom.participants);
        }

        // Update all room participants
        const updatedRoomParticipantsMap = {};
        userRooms.forEach((userRoom) => {
          const currentRoom = updatedRooms[userRoom.roomId];
          if (currentRoom && currentRoom.participants) {
            updatedRoomParticipantsMap[userRoom.roomId] =
              currentRoom.participants;
          }
        });
        setAllRoomsParticipants(updatedRoomParticipantsMap);

        // Update joined rooms
        const updatedUserRooms = JSON.parse(
          localStorage.getItem("joinedRooms") || "[]"
        );
        if (JSON.stringify(updatedUserRooms) !== JSON.stringify(joinedRooms)) {
          setJoinedRooms(updatedUserRooms);
        }
      }, 1000);

      return () => {
        if (messagePollingRef.current) {
          clearInterval(messagePollingRef.current);
        }
      };
    };

    initializeRoom();
  }, [roomId, navigate]);

  // Handle clicks outside panels
  useEffect(() => {
    function handleClickOutside(event) {
      let clickedInsideAnyPanel = false;
      let clickedOnAnyToggleButton = false;

      // Check if clicked on any toggle button
      if (
        event.target.classList.contains("toggle-users-btn") ||
        event.target.classList.contains("users-icon")
      ) {
        clickedOnAnyToggleButton = true;
      }

      // Check if clicked inside any participant panel
      Object.keys(participantRefs.current).forEach((roomId) => {
        const ref = participantRefs.current[roomId];
        if (ref && ref.contains(event.target)) {
          clickedInsideAnyPanel = true;
        }
      });

      // If clicked outside all panels and not on a toggle button, close all panels
      if (!clickedInsideAnyPanel && !clickedOnAnyToggleButton) {
        setExpandedRooms({});
      }

      // Close emoji picker if clicked outside
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !event.target.classList.contains("emoji-button")
      ) {
        setShowEmojiPicker(false);
        setIsEmojiOn(false);
      }

      // Close language selector if clicked outside
      // Inside your useEffect that handles outside clicks
      if (
        languageSelectorRef.current &&
        !languageSelectorRef.current.contains(event.target) &&
        !event.target.closest(".code-button") // Use closest for better detection
      ) {
        // Start animation before hiding
        setLanguageSelectorHiding(true);
        setTimeout(() => {
          setShowLanguageSelector(false);
          setIsCodeOn(false);
          setLanguageSelectorHiding(false);
        }, 300);
      }

      // Close mention list if clicked outside
      if (
        showMentionList &&
        mentionListRef.current &&
        !mentionListRef.current.contains(event.target) &&
        event.target !== messageInputRef.current
      ) {
        setShowMentionList(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLanguageSelector, showMentionList]);

  // NEW: Initial scroll to bottom on mount
  useEffect(() => {
    if (messagesContainerRef.current && !loading) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        setIsAtBottom(true);
      }, 100);
    }
  }, [loading]);

  // IMPROVED: Only scroll when messages updated AND user is at bottom
  useEffect(() => {
    if (messagesUpdated && isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setMessagesUpdated(false);
    }
  }, [messagesUpdated, isAtBottom]);

  // Update last activity when sending messages or switching rooms
  useEffect(() => {
    // Update last activity timestamp for this room
    const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
    const updatedRooms = userRooms.map((room) => {
      if (room.roomId === roomId) {
        return { ...room, lastActivity: new Date().toISOString() };
      }
      return room;
    });
    localStorage.setItem("joinedRooms", JSON.stringify(updatedRooms));
  }, [roomId]);

  // Handle tagging a message
  const handleTagMessage = (message) => {
    setTaggedMessage(message);
  };

  // Clear the tagged message
  const clearTaggedMessage = () => {
    setTaggedMessageHiding(true);
    setTimeout(() => {
      setTaggedMessage(null);
      setTaggedMessageHiding(false);
    }, 300); // Match the animation duration
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !fileInputRef.current?.files?.length) return;
    
    // Check if user is authenticated
    if (!authUser) {
      setError('Please log in to send messages');
      return;
    }

    const messageData = {
      roomId,
      user: {
        username: getDisplayUsername(),
        email: authUser.email,
        name: authUser.name,
        color: authUser.color || '#007bff'
      },
      text: messageInput,
      code: isCodeOn ? messageInput : null,
      language: isCodeOn ? selectedLanguage : null,
      output: null,
      attachment: fileInputRef.current?.files?.length
        ? fileInputRef.current.files[0].name
        : null,
      replyTo: taggedMessage
        ? {
            id: taggedMessage.id || new Date(taggedMessage.timestamp).getTime(),
            text: taggedMessage.text,
            sender: taggedMessage.sender,
          }
        : null,
      isCode: isCodeOn
    };

    console.log('Attempting to send message:', messageData);

    let messageSent = false;

    // First try Socket.IO if connected
    if (socketService.isConnected()) {
      try {
        console.log('Sending message via Socket.IO');
        socketService.sendMessage(messageData);
        messageSent = true;
        console.log('Message sent via Socket.IO');
      } catch (error) {
        console.error('Socket.IO send failed:', error);
      }
    }

    // If Socket.IO failed or not connected, use REST API
    if (!messageSent) {
      console.log('Socket.IO not available, using REST API fallback');
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
        const response = await fetch(`${apiUrl}/api/rooms/${roomId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            user: getUserIdentifier(),
            text: messageInput,
            code: isCodeOn ? messageInput : null,
            language: isCodeOn ? selectedLanguage : null
          }),
        });

        if (response.ok) {
          const newMessage = await response.json();
          // Format message for local display
          const formattedMessage = {
            ...newMessage,
            id: newMessage._id,
            user: newMessage.user,
            sender: newMessage.user,
            senderName: newMessage.user,
            timestamp: newMessage.createdAt,
            isCode: !!(newMessage.code || newMessage.language)
          };
          
          setMessages(prevMessages => {
            // Check if message already exists
            const exists = prevMessages.some(msg => msg._id === newMessage._id || msg.id === newMessage._id);
            if (!exists) {
              return [...prevMessages, formattedMessage];
            }
            return prevMessages;
          });
          
          console.log('Message sent via REST API');
          messageSent = true;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('REST API failed:', error);
        setError(`Failed to send message: ${error.message}`);
        
        // As last resort, add message locally
        const localMessage = {
          _id: Date.now().toString(),
          id: Date.now().toString(),
          user: getUserIdentifier(),
          sender: getUserIdentifier(),
          senderName: getUserIdentifier(),
          text: messageInput,
          code: isCodeOn ? messageInput : null,
          language: isCodeOn ? selectedLanguage : null,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          local: true, // Mark as local message
          isCode: isCodeOn
        };
        setMessages(prevMessages => [...prevMessages, localMessage]);
        messageSent = true;
      }
    }

    if (messageSent) {
      // Update last activity for this room
      const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
      const updatedRooms = userRooms.map((room) => {
        if (room.roomId === roomId) {
          return { ...room, lastActivity: new Date().toISOString() };
        }
        return room;
      });
      localStorage.setItem("joinedRooms", JSON.stringify(updatedRooms));

      // Update state and UI
      prevMessagesLengthRef.current = messages.length + 1;
      setMessageInput("");
      setError(null); // Clear any previous errors

      // Clear tagged message *after* the message is sent
      setTaggedMessage(null);

      // Clear any file selections
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Hide emoji picker and reset button states
      setShowEmojiPicker(false);
      setIsEmojiOn(false);
      setIsCodeOn(false);
      setShowLanguageSelector(false);

      // Ensure we scroll to bottom after sending a message
      setIsAtBottom(true);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Updated handle input change to detect mentions
  const handleInputChange = (e) => {
    const newValue = e.target.value;

    // Send typing indicator
    if (authUser && roomId && socketService.isConnected()) {
      socketService.sendTyping(roomId, authUser, newValue.length > 0);
    }

    // Special check for @ removal - explicitly handle this case
    if (messageInput.includes("@") && !newValue.includes("@")) {
      setShowMentionList(false);
    }

    setMessageInput(newValue);

    // Check for mention context
    if (!isCodeOn) {
      // Don't process mentions in code mode
      handleMentionDetection(newValue, e.target.selectionStart);
    } else {
      setShowMentionList(false);
    }
  };

  // Handle keydown in the message input - modified for textarea
  const handleKeyDown = (e) => {
    // Handle mention list navigation with arrow keys
    if (showMentionList && filteredParticipants.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        // Could implement selected index logic here if needed
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        // Select the first (or currently selected) user from the filtered list
        handleSelectMention(filteredParticipants[0].username);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionList(false);
        return;
      }
    }

    // Send message on Enter without shift key
    if (e.key === "Enter" && !e.shiftKey && !showMentionList) {
      e.preventDefault();
      sendMessage(new Event("submit"));
    }
    // Allow new line with Shift+Enter (default behavior)
  };

  const handleAttachmentClick = () => {
    setIsAttachmentOn(true);
    fileInputRef.current.click();
    // Reset when file is selected or dialog is closed
    setTimeout(() => setIsAttachmentOn(false), 500);
  };

  const handleFileSelected = (e) => {
    if (e.target.files.length > 0) {
      // For a real application, you would upload the file to a server here
      // For this demo, we'll just add the filename to the message
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("attachment", file);

      // Create a message with the file attachment
      const newMessage = {
        text: `Shared file: ${file.name}`,
        sender: user.username,
        senderName: user.username,
        color: user.color, // Include user's color
        timestamp: new Date().toISOString(),
        attachment: file.name,
        replyTo: taggedMessage
          ? {
              id:
                taggedMessage.id || new Date(taggedMessage.timestamp).getTime(),
              text: taggedMessage.text,
              sender: taggedMessage.sender,
            }
          : null,
      };

      // Add message to localStorage
      const allMessages = JSON.parse(
        localStorage.getItem("chatMessages") || "{}"
      );
      const roomMessages = allMessages[roomId] || [];
      roomMessages.push(newMessage);
      allMessages[roomId] = roomMessages;
      localStorage.setItem("chatMessages", JSON.stringify(allMessages));

      // Update state
      setMessages([...messages, newMessage]);
      prevMessagesLengthRef.current = messages.length + 1;

      // Clear tagged message
      setTaggedMessage(null);

      // Clear the file input
      fileInputRef.current.value = "";

      // Ensure we scroll to bottom after sending a file
      setIsAtBottom(true);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleEmojiClick = (e) => {
    // Add event parameter
    e.stopPropagation();
    if (showEmojiPicker) {
      // Start exit animation
      setEmojiPickerHiding(true);
      setTimeout(() => {
        setShowEmojiPicker(false);
        setIsEmojiOn(false);
        setEmojiPickerHiding(false);
      }, 300); // Increased to ensure animation completes
    } else {
      setShowEmojiPicker(true);
      setIsEmojiOn(true);
      // Close other trays
      setShowLanguageSelector(false);
      setShowMentionList(false);
    }
  };

  const insertEmoji = (emoji) => {
    setMessageInput((prevInput) => prevInput + emoji);
    // Don't close immediately to allow multiple emoji selection
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handleCodeClick = (e) => {
    // Add event parameter and stop propagation
    e.stopPropagation();

    if (showLanguageSelector) {
      // Start exit animation
      setLanguageSelectorHiding(true);
      setTimeout(() => {
        setShowLanguageSelector(false);
        setIsCodeOn(false);
        setLanguageSelectorHiding(false);
      }, 300); // Match the animation duration
    } else {
      setShowLanguageSelector(true);
      setIsCodeOn(true);
      // Close other trays
      setShowEmojiPicker(false);
      setIsEmojiOn(false);
      setShowMentionList(false);
    }
  };

  // Function to leave room from the sidebar
  const handleLeaveRoomFromSidebar = (roomIdToLeave) => {
    // Remove user from participants in the room to leave
    const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
    const roomToLeave = rooms[roomIdToLeave];

    if (roomToLeave) {
      roomToLeave.participants = roomToLeave.participants.filter(
        (p) => p.username !== user.username
      );
      rooms[roomIdToLeave] = roomToLeave;
      localStorage.setItem("chatRooms", JSON.stringify(rooms));
    }

    // Get all joined rooms
    const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");

    // Remove the room from joined rooms
    const updatedRooms = userRooms.filter(
      (room) => room.roomId !== roomIdToLeave
    );
    localStorage.setItem("joinedRooms", JSON.stringify(updatedRooms));

    // Update state to reflect changes
    setJoinedRooms(updatedRooms);

    // If the user is currently in the room they're leaving, navigate to another room
    if (roomIdToLeave === roomId) {
      // Find the next available room
      if (updatedRooms.length > 0) {
        const nextRoom = updatedRooms[0];

        // Update active user info
        localStorage.setItem(
          "chatUser",
          JSON.stringify({
            ...user,
            roomId: nextRoom.roomId,
            joinedAt: new Date().toISOString(),
          })
        );

        // Navigate to next room
        navigate(`/room/${nextRoom.roomId}`);
      } else {
        // No rooms left, go to home
        navigate("/");
      }
    }
  };

  const leaveRoom = () => {
    // Remove user from participants
    const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
    const room = rooms[roomId];

    if (room) {
      room.participants = room.participants.filter(
        (p) => p.username !== user.username
      );
      rooms[roomId] = room;
      localStorage.setItem("chatRooms", JSON.stringify(rooms));
    }

    // Get all joined rooms BEFORE removing the current one
    const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");

    // Find the current room to see its position
    const currentRoomIndex = userRooms.findIndex(
      (room) => room.roomId === roomId
    );

    // Get a copy of the rooms without the current one
    const updatedRooms = userRooms.filter((room) => room.roomId !== roomId);

    // Save the updated rooms list to localStorage
    localStorage.setItem("joinedRooms", JSON.stringify(updatedRooms));

    // Check if we have any rooms left to navigate to
    if (updatedRooms.length > 0) {
      console.log("Found other rooms, switching...");

      // Try to stay at the same index if possible, otherwise take the last room
      const nextIndex = Math.min(currentRoomIndex, updatedRooms.length - 1);
      const nextRoom = updatedRooms[nextIndex];

      // Set the active user's roomId to the next room
      localStorage.setItem(
        "chatUser",
        JSON.stringify({
          ...user,
          roomId: nextRoom.roomId,
          joinedAt: new Date().toISOString(),
        })
      );

      // Update last activity timestamp for the next room
      const roomsWithUpdatedActivity = updatedRooms.map((room) => {
        if (room.roomId === nextRoom.roomId) {
          return { ...room, lastActivity: new Date().toISOString() };
        }
        return room;
      });
      localStorage.setItem(
        "joinedRooms",
        JSON.stringify(roomsWithUpdatedActivity)
      );

      // Use window.location instead of navigate for a guaranteed page change
      navigate(`/room/${nextRoom.roomId}`);
      return; // Exit function early to prevent navigate("/") from executing
    }

    // Only reach here if no rooms are left
    console.log("No rooms left, going to home page");
    navigate("/");
  };

  const switchRoom = (newRoomId) => {
    // Update active user info
    localStorage.setItem(
      "chatUser",
      JSON.stringify({
        ...user,
        roomId: newRoomId,
      })
    );

    // Reset unread count for this room
    setUnreadCounts((prev) => ({
      ...prev,
      [newRoomId]: 0,
    }));

    // Update last activity for the new room
    const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
    const updatedRooms = userRooms.map((room) => {
      if (room.roomId === newRoomId) {
        return { ...room, lastActivity: new Date().toISOString() };
      }
      return room;
    });
    localStorage.setItem("joinedRooms", JSON.stringify(updatedRooms));

    // Clear tagged message when switching rooms
    setTaggedMessage(null);

    // Navigate to new room
    navigate(`/room/${newRoomId}`);
  };

  const goToHome = () => {
    navigate("/");
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard
      .writeText(roomLink)
      .then(() => {
        alert("Room link copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy room link:", err);
      });
  };

  // UPDATED: Simplified toggleParticipants function
  const toggleParticipants = (roomId, e) => {
    e.stopPropagation();

    // Simply toggle the expanded state
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  if (loading) {
    return <div className="loading">Loading chat room...</div>;
  }

  if (!authUser) {
    return (
      <div className="error-container">
        <h2>Authentication Required</h2>
        <p>Please log in to access the chat room.</p>
        <button onClick={() => navigate('/')} className="home-button">
          Back to Home
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  // Generate palette based on room color
  const roomPalette = roomInfo?.color
    ? generateRoomPalette(roomInfo.color)
    : null;

  return (
    <div className="chat-container">
      {/* Top Header Bar */}
      <div className="top-header">
        <div className="header-left">
          <div className="room-title-header">
            Room #{roomId}
            <div className="room-status-badge">
              {socketConnected ? 'Online' : 'Connecting...'}
            </div>
          </div>
        </div>
        
        <div className="header-center">
          <div className="search-container">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="header-right">
          <button onClick={copyRoomLink} className="action-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Share
          </button>
          <button onClick={() => setShowInstantMeet(true)} className="action-btn success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            Start Meeting
          </button>
          <button onClick={() => setShowMeetingScheduler(true)} className="action-btn warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Schedule
          </button>
          <button onClick={() => setShowMeetingsList(true)} className="action-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Meetings
          </button>
          {isUserAdmin && (
            <button onClick={() => setShowAdminPanel(true)} className="action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
              </svg>
              Admin
            </button>
          )}
          <button onClick={leaveRoom} className="action-btn danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16,17 21,12 16,7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Leave
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
            My Rooms
          </div>
          <button
            className="add-room-btn"
            onClick={goToHome}
            title="Join or Create Room"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Room
          </button>
        </div>

        <div className="sidebar-content">
          <div className="rooms-section">
            <div className="rooms-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9,22 9,12 15,12 15,22"></polyline>
              </svg>
              Rooms
            </div>
            {joinedRooms.length === 0 ? (
              <div className="no-rooms-message">
                <p>No rooms joined yet</p>
                <button onClick={goToHome} className="home-button">
                  Join a Room
                </button>
              </div>
            ) : (
              <div className="rooms-list" ref={roomsListRef}>
              {joinedRooms
                .slice()
                .sort((a, b) => {
                  const indexA = roomOrder.indexOf(a.roomId);
                  const indexB = roomOrder.indexOf(b.roomId);
                  return indexA - indexB;
                })
                .map((room, index) => {
                  // Get room data including color
                  const rooms = JSON.parse(
                    localStorage.getItem("chatRooms") || "{}"
                  );
                  return (
                    <React.Fragment key={room.roomId}>
                      <div
                        className={`room-item ${
                          room.roomId === roomId ? "active" : ""
                        }`}
                        onClick={() => switchRoom(room.roomId)}
                      >
                        <div className="room-item-header">
                          <div className="room-item-name">
                            Room #{room.roomId}
                          </div>
                          <div className="room-item-count">
                            {allRoomsParticipants[room.roomId]?.length || 0}
                          </div>
                        </div>
                        <div className="room-item-users">
                          {allRoomsParticipants[room.roomId]?.length || 0} members
                        </div>

                        <button
                          className={`toggle-users-btn ${
                            expandedRooms[room.roomId] ? "active" : ""
                          }`}
                          onClick={(e) => toggleParticipants(room.roomId, e)}
                          title={
                            expandedRooms[room.roomId]
                              ? "Hide users"
                              : "Show users"
                          }
                        >
                          <span className="users-icon"></span>
                        </button>

                        {/* Leave room button after toggle users button */}
                        <button
                          className="leave-room-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveRoomFromSidebar(room.roomId);
                          }}
                          title="Leave Room"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>

                      {/*sohamghosh-jellylemonshake-23bps1146 */
                      /* UPDATED: Changed the participants panel to always render with conditional className */}
                      <div
                        className={`participants-panel ${
                          expandedRooms[room.roomId] ? "active" : ""
                        }`}
                        ref={(el) =>
                          (participantRefs.current[room.roomId] = el)
                        }
                      >
                        <div className="participants-header">
                          <h3>
                            Participants (
                            {allRoomsParticipants[room.roomId]?.length || 0})
                          </h3>
                          <button
                            className="close-participants"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleParticipants(room.roomId, e);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                        <ul className="participants-list">
                          {allRoomsParticipants[room.roomId]?.map(
                            (participant, index) => (
                              <li
                                key={index}
                                className={`participant-item ${
                                  participant.username === user.username
                                    ? "current-user"
                                    : ""
                                }`}
                                style={{ "--item-index": index }}
                              >
                                <div
                                  className="participant-avatar"
                                  style={{
                                    backgroundColor: participant.avatar
                                      ? "transparent"
                                      : participant.color ||
                                        "var(--accent-color)",
                                  }}
                                >
                                  {participant.avatar ? (
                                    <img
                                      src={`${participant.avatar}${
                                        participant.avatar.includes("?")
                                          ? "&"
                                          : "?"
                                      }v=${avatarVersion}`}
                                      alt={participant.username}
                                      className="participant-avatar-img"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        // Show fallback first letter avatar
                                        const parent = e.target.parentNode;
                                        if (
                                          !parent.querySelector(
                                            ".participant-avatar-fallback"
                                          )
                                        ) {
                                          const fallback =
                                            document.createElement("div");
                                          fallback.className =
                                            "participant-avatar-fallback";
                                          fallback.innerText =
                                            participant.username
                                              .charAt(0)
                                              .toUpperCase();
                                          parent.appendChild(fallback);
                                        }
                                      }}
                                    />
                                  ) : (
                                    participant.username.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div
                                  className="participant-name"
                                  style={{
                                    color:
                                      participant.color ||
                                      "rgba(255, 255, 255, 0.9)",
                                  }}
                                >
                                  {participant.username}{" "}
                                  {participant.username === user.username
                                    ? "(You)"
                                    : ""}
                                  {participant.isCreator && " (Creator)"}
                                </div>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Members Section */}
          <div className="members-section">
            <div className="members-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Members
              <span className="members-count">
                {participants.length}
              </span>
            </div>
            <div className="members-list">
              {participants.map((participant, index) => (
                <div key={index} className="member-item">
                  <div 
                    className="member-avatar"
                    style={{ backgroundColor: participant.color || '#6366f1' }}
                  >
                    {participant.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {participant.username}
                      {participant.username === getUserIdentifier() && " (You)"}
                    </div>
                    <div className="member-role">
                      {participant.isCreator ? "Creator" : "Member"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer" ref={userMenuRef}>
          <div
            className="user-info"
            onMouseEnter={() => setUserDropupOpen(true)}
            onMouseLeave={() => setUserDropupOpen(false)}
          >
            <button
              className="user-menu-button"
              onClick={() => setUserDropupOpen(!userDropupOpen)}
            >
              {isAuthenticated && authUser?.avatar ? (
                <img
                  src={authUser.avatar}
                  alt="Profile"
                  className="user-avatar"
                />
              ) : (
                <div
                  className="user-avatar"
                  style={{
                    backgroundColor: user?.color || "var(--accent-color)",
                  }}
                >
                  {user?.username.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            <div
              className="user-name"
              style={{ color: user?.color || "rgba(255, 255, 255, 0.9)" }}
            >
              {isAuthenticated
                ? authUser?.name || user?.username
                : user?.username}
            </div>

            {userDropupOpen && (
              <div className="sidebar-dropup-menu">
                <div className="sidebar-user-info">
                  <div className="user-name">
                    {isAuthenticated ? authUser?.name : user?.username}
                  </div>
                  {isAuthenticated && (
                    <div className="user-email">{authUser?.email}</div>
                  )}
                </div>

                <Link
                  to="/profile"
                  className="sidebar-menu-item"
                  onClick={() => setUserDropupOpen(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Profile
                </Link>

                <button
                  className="sidebar-menu-item logout"
                  onClick={handleMenuLogout}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="chat-main"
        style={
          roomPalette
            ? {
                "--room-base-color": roomPalette.baseColor,
                "--room-lighter-color": roomPalette.lighterShade,
                "--room-darker-color": roomPalette.darkerShade,
                "--room-mid-color": roomPalette.midShade,
                background: roomPalette.lighterShade,
              }
            : {}
        }
      >


        {/* Main Chat Area */}
        <div className="main-chat">

          {/* Code Execution Area */}
          <div style={{ margin: '1rem 0' }}>
  <button onClick={() => setExecutionMode((m) => !m)} style={{ padding: '0.5rem 1rem' }}>
    {executionMode ? 'Exit Execution Mode' : 'I want to execute code'}
  </button>
</div>

{executionMode && (
  <div style={{ marginBottom: '1rem', background: '#222', padding: '1rem', borderRadius: '8px' }}>
    <div style={{ marginBottom: '0.5rem' }}>
      <label style={{ color: '#fff', marginRight: '0.5rem' }}>Language:</label>
      <select value={runLanguage} onChange={e => setRunLanguage(e.target.value)}>
        {codeLanguages.map(lang => (
          <option key={lang.id} value={lang.id}>{lang.name}</option>
        ))}
      </select>
    </div>
    <textarea
      value={codeToRun}
      onChange={e => setCodeToRun(e.target.value)}
      placeholder="Type code to execute..."
      rows={8}
      style={{ width: '100%', fontFamily: 'monospace', fontSize: '1rem', background: '#1a1a1a', color: '#fff', border: '1px solid #444', borderRadius: '4px', marginBottom: '0.5rem' }}
    />
    <button
      onClick={async () => {
        setIsRunning(true);
        setRunOutput("");
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
          const res = await fetch(`${apiUrl}/api/jdoodle/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: codeToRun, language: runLanguage })
          });
          const data = await res.json();
          setRunOutput(data.output || data.error || JSON.stringify(data));
        } catch (err) {
          setRunOutput("Error: " + err.message);
        }
        setIsRunning(false);
      }}
      disabled={isRunning || !codeToRun.trim()}
      style={{ padding: '0.5rem 1rem', marginRight: '1rem' }}
    >
      {isRunning ? 'Running...' : 'Run'}
    </button>
    {runOutput && (
      <pre style={{ background: '#111', color: '#0f0', padding: '0.75rem', borderRadius: '4px', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{runOutput}</pre>
    )}
  </div>
)}

        <div className="chat-content">
          <div className="messages-container" style={{ position: "relative" }}>
            {/*sohamghosh-jellylemonshake-23bps1146 */
            /* IMPROVED: Added overflow-anchor: none to prevent browser's automatic scroll anchoring */}
            <div
              className="messages-list"
              ref={messagesContainerRef}
              onScroll={handleScroll}
              style={{ overflowAnchor: "none" }}
            >
              {messages.length === 0 ? (
                <div className="no-messages">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message, index) => (
                  <MessageItem
                    key={index}
                    message={message}
                    isCurrentUser={message.user === (user?.username || user?.email || getUserIdentifier())}
                    onTagMessage={handleTagMessage}
                    isHovered={
                      hoveredMessageId ===
                      (message.id || new Date(message.timestamp).getTime())
                    }
                    isHighlighted={highlightedMessageIds.includes(
                      message.id || new Date(message.timestamp).getTime()
                    )}
                    isActiveHighlight={
                      searchResults.length > 0 &&
                      currentSearchResultIndex >= 0 &&
                      (message.id || new Date(message.timestamp).getTime()) ===
                        (searchResults[currentSearchResultIndex]?.id ||
                          new Date(
                            searchResults[currentSearchResultIndex]?.timestamp
                          ).getTime())
                    }
                    onMouseEnter={(id) => setHoveredMessageId(id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                    roomColor={roomInfo?.color}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {showScrollButton && (
              <button
                className={`scroll-down-button ${
                  scrollButtonHiding ? "hiding" : ""
                }`}
                onClick={scrollToBottom}
                title="Scroll to latest messages"
                style={{
                  backgroundColor:
                    roomPalette?.baseColor || "var(--primary-color)",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            )}
            <form onSubmit={sendMessage} className="message-form">
              {/* Tagged message preview */}
              {taggedMessage && (
                <div
                  className={`tagged-message-preview ${
                    taggedMessageHiding ? "hiding" : ""
                  }`}
                >
                  <div className="tagged-content">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 14 4 9 9 4"></polyline>
                      <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                    </svg>
                    <span>
                      <strong>{taggedMessage.sender}:</strong>{" "}
                      {taggedMessage.text.substring(0, 7) + "..."}
                    </span>
                  </div>
                  <button
                    className="clear-tag"
                    onClick={clearTaggedMessage}
                    title="Cancel reply"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}

              <div className="message-tools">
                <button
                  type="button"
                  className={`tool-button attachment-button ${
                    isAttachmentOn ? "active" : ""
                  }`}
                  onClick={handleAttachmentClick}
                  title="Attach File"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
                  </svg>
                </button>

                <button
                  type="button"
                  className={`tool-button emoji-button ${
                    isEmojiOn ? "active" : ""
                  }`}
                  onClick={handleEmojiClick}
                  title="Insert Emoji"
                >
                  <span className="emoji-button-wrapper">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none" /* This prevents the SVG from capturing clicks */
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </span>
                </button>

                <button
                  type="button"
                  className={`tool-button code-button ${
                    isCodeOn ? "active" : ""
                  }`}
                  onClick={handleCodeClick}
                  title="Insert Code"
                >
                  <span className="code-button-wrapper">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none" // Prevent SVG from capturing clicks
                    >
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                  </span>
                </button>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div
                    className={`emoji-picker ${emojiPickerHiding ? "hiding" : ""}`}
                    ref={emojiPickerRef}
                    style={{ zIndex: 1000 }}
                  >
                    <EmojiPicker
                      onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                      theme="dark"
                      width={300}
                    />
                  </div>
                )}

                {/* Language Selector */}
                {showLanguageSelector && (
                  <div
                    className={`language-selector ${
                      languageSelectorHiding ? "hiding" : ""
                    }`}
                    ref={languageSelectorRef}
                  >
                    <div className="language-dropdown">
                      {codeLanguages.map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          className={`language-option ${
                            selectedLanguage === lang.id ? "selected" : ""
                          }`}
                          onClick={() => handleLanguageSelect(lang.id)}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mention User List */}
                {showMentionList && filteredParticipants.length > 0 && (
                  <div className="mention-list" ref={mentionListRef}>
                    {filteredParticipants.map((participant) => (
                      <button
                        key={participant.username}
                        type="button"
                        className="mention-item"
                        onClick={() =>
                          handleSelectMention(participant.username)
                        }
                      >
                        <div
                          className="mention-avatar"
                          style={{
                            backgroundColor:
                              participant.color || "var(--accent-color)",
                          }}
                        >
                          {participant.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="mention-name">
                          {participant.username}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileSelected}
                />
              </div>

              {/* Textarea for message input */
              /*sohamghosh-jellylemonshake-23bps1146 */}
              <div
                className={`message-input-container ${
                  isCodeOn ? "code-mode" : ""
                }`}
              >
                <textarea
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isCodeOn
                      ? "Type or paste code here..."
                      : "Type a message... (use @ to mention)"
                  }
                  className={`message-input ${isCodeOn ? "code-input" : ""}`}
                  rows="1"
                  style={{
                    overflowY: "hidden",
                    backgroundColor: isCodeOn ? "#282a36" : "",
                    color: isCodeOn ? "white" : "",
                  }}
                ></textarea>
              </div>

              <button
                type="submit"
                className="send-button"
                style={{
                  backgroundColor:
                    roomPalette?.baseColor || "var(--primary-color)",
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
        </div> {/* End of main-chat */}
        </div> {/* End of main-content */}
      </div> {/* End of chat-container */}

      {showLoginPrompt && (
        <div
          className="login-prompt-overlay"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="login-prompt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Save your favorite rooms</h3>
            <p>
              Sign up or log in to save rooms and access them easily from your
              profile.
            </p>
            <div className="login-prompt-buttons">
              <Link to="/register" className="prompt-button register">
                Sign Up
              </Link>
              <Link to="/login" className="prompt-button login">
                Log In
              </Link>
              <button
                className="prompt-button cancel"
                onClick={() => setShowLoginPrompt(false)}
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showMeetingScheduler && (
        <div className="meeting-scheduler-overlay">
          <div className="meeting-scheduler-modal">
            <MeetingScheduler
              roomId={roomId}
              participants={participants}
              onClose={() => setShowMeetingScheduler(false)}
              onMeetingCreated={(meeting) => {
                console.log('Meeting created:', meeting);
                setShowMeetingScheduler(false);
                // You can add logic here to notify participants about the new meeting
              }}
            />
          </div>
        </div>
      )}

      {showInstantMeet && (
        <div className="instant-meet-overlay">
          <div className="instant-meet-modal">
            <InstantMeet
              roomId={roomId}
              participants={participants}
              onClose={() => setShowInstantMeet(false)}
              onMeetingStarted={(meetingData) => {
                console.log('Instant meeting started:', meetingData);
                setShowInstantMeet(false);
                // You can add logic here to handle the started meeting
              }}
            />
          </div>
        </div>
      )}

      {isUserAdmin && (
        <AdminPanel
          roomId={roomId}
          onClose={() => setShowAdminPanel(false)}
          isVisible={showAdminPanel}
        />
      )}
      
      {showMeetingsList && (
        <MeetingsList
          roomId={roomId}
          onClose={() => setShowMeetingsList(false)}
          isVisible={showMeetingsList}
        />
      )}
    </div>
  );
}

export default ChatRoom;
