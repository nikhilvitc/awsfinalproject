import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import MessageItem from "./MessageItem";
import { useAuth } from "./AuthContext";
import "../styles/components/ChatRoom.css";

function ChatRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user: authUser, logout, avatarVersion } = useAuth();

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

  // Common emojis for the picker
  const commonEmojis = [
    "😊",
    "😂",
    "❤️",
    "👍",
    "🎉",
    "😎",
    "😢",
    "🤔",
    "👋",
    "🙏",
    "🔥",
    "✨",
    "💯",
    "🤣",
    "😊",
    "🥳",
    "👏",
    "💪",
    "🤦‍♂️",
    "🤷‍♀️",
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

    // Get room data from localStorage
    const rooms = JSON.parse(localStorage.getItem("chatRooms") || "{}");
    const room = rooms[roomId];

    if (!room) {
      setError("Room not found");
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
    setParticipants(room.participants);

    // Get participants for all rooms
    const roomParticipantsMap = {};
    userRooms.forEach((userRoom) => {
      const currentRoom = rooms[userRoom.roomId];
      if (currentRoom && currentRoom.participants) {
        roomParticipantsMap[userRoom.roomId] = currentRoom.participants;
      }
    });
    setAllRoomsParticipants(roomParticipantsMap);

    // Get messages for this room
    const allMessages = JSON.parse(
      localStorage.getItem("chatMessages") || "{}"
    );
    const roomMessages = allMessages[roomId] || [];
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

  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !fileInputRef.current?.files?.length) return;

    const newMessage = {
      text: messageInput,
      sender: user.username,
      senderName: user.username,
      color: user.color,
      timestamp: new Date().toISOString(),
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
      // Add code-related properties if code mode is on
      isCode: isCodeOn,
      language: isCodeOn ? selectedLanguage : null,
    };

    // Add message to localStorage
    const allMessages = JSON.parse(
      localStorage.getItem("chatMessages") || "{}"
    );
    const roomMessages = allMessages[roomId] || [];
    roomMessages.push(newMessage);
    allMessages[roomId] = roomMessages;
    localStorage.setItem("chatMessages", JSON.stringify(allMessages));

    // Update last activity for this room
    const userRooms = JSON.parse(localStorage.getItem("joinedRooms") || "[]");
    const updatedRooms = userRooms.map((room) => {
      if (room.roomId === roomId) {
        return { ...room, lastActivity: new Date().toISOString() };
      }
      return room;
    });
    localStorage.setItem("joinedRooms", JSON.stringify(updatedRooms));

    // Update state
    setMessages([...messages, newMessage]);
    prevMessagesLengthRef.current = messages.length + 1;
    setMessageInput("");

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
  };

  // Updated handle input change to detect mentions
  const handleInputChange = (e) => {
    const newValue = e.target.value;

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
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>My Rooms</h2>
          <button
            className="add-room-button"
            onClick={goToHome}
            title="Join or Create Room"
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
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <div className="rooms-sidebar">
          {joinedRooms.length === 0 ? (
            <div className="no-rooms-sidebar">
              <p>No rooms joined yet</p>
              <button onClick={goToHome} className="join-room-btn">
                Join a Room
              </button>
            </div>
          ) : (
            <ul className="rooms-list-sidebar" ref={roomsListRef}>
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
                      <li
                        className={`room-item-sidebar ${
                          room.roomId === roomId ? "active" : ""
                        } ${draggedRoom === room.roomId ? "dragging" : ""} ${
                          dragOverRoom === room.roomId ? "drag-over" : ""
                        } ${dragDirection === "up" ? "shift-up" : ""} ${
                          dragDirection === "down" ? "shift-down" : ""
                        }`}
                        draggable="true"
                        onDragStart={(e) =>
                          handleDragStart(e, room.roomId, index)
                        }
                        onDragOver={(e) =>
                          handleDragOver(e, room.roomId, index)
                        }
                        onDrop={(e) => handleDrop(e, room.roomId)}
                        onDragEnd={handleDragEnd}
                        style={{
                          transition: draggedRoom
                            ? "transform 0.3s ease, opacity 0.3s ease"
                            : "none",
                          zIndex: draggedRoom === room.roomId ? "10" : "1",
                          position: "relative",
                        }}
                      >
                        <div
                          className="room-item-content"
                          onClick={() => switchRoom(room.roomId)}
                        >
                          <div
                            className="room-item-avatar"
                            style={{
                              backgroundColor:
                                rooms[room.roomId]?.color ||
                                "var(--primary-color)",
                            }}
                          >
                            <span
                              className="unread-count"
                              style={{
                                color: getContrastingColor(
                                  rooms[room.roomId]?.color ||
                                    "var(--primary-color)"
                                ),
                              }}
                            >
                              {unreadCounts[room.roomId] > 99
                                ? "99+"
                                : unreadCounts[room.roomId] || 0}
                            </span>
                          </div>
                          <div className="room-item-details">
                            <div className="room-item-name">
                              Room #{room.roomId}
                              {room.isPrivate && (
                                <span className="private-badge mini">P</span>
                              )}
                            </div>
                            <div className="room-item-info">
                              {allRoomsParticipants[room.roomId]?.length || 0}{" "}
                              users
                            </div>
                          </div>
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
                      </li>

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
            </ul>
          )}
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
        <div className="chat-header">
          <div className="room-info">
            <h1>Room #{roomId}</h1>
            {roomInfo?.isPrivate && (
              <span className="private-badge">Private</span>
            )}
            {/* Add save room button here */}
            {isAuthenticated && (
              <button
                className={`save-room-button ${isRoomSaved ? "saved" : ""}`}
                onClick={toggleSaveRoom}
                title={isRoomSaved ? "Unsave this room" : "Save this room"}
              >
                {isRoomSaved ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                )}
              </button>
            )}
          </div>

          <div className="room-actions">
            {/* Add search button and container here */}
            <div className="search-container">
              <button
                className="search-button"
                onClick={toggleSearch}
                title="Search messages"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              <div
                ref={searchContainerRef}
                className={`search-input-container ${
                  isSearchOpen ? "active" : ""
                }`}
              >
                <svg
                  className="search-icon"
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
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>

                <input
                  type="text"
                  className="search-input"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={handleSearch}
                  autoFocus={isSearchOpen}
                />

                {searchQuery && (
                  <>
                    <div className="search-counter">
                      {searchResults.length > 0 ? (
                        <span className="result-count">
                          {currentSearchResultIndex + 1} of{" "}
                          {searchResults.length}
                        </span>
                      ) : (
                        <span className="no-results">No results</span>
                      )}
                    </div>

                    {searchResults.length > 1 && (
                      <div className="search-navigation">
                        <button
                          className="search-nav-button"
                          onClick={() => navigateSearchResults("prev")}
                          title="Previous result"
                          disabled={searchResults.length <= 1}
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
                            <polyline points="18 15 12 9 6 15"></polyline>
                          </svg>
                        </button>
                        <button
                          className="search-nav-button"
                          onClick={() => navigateSearchResults("next")}
                          title="Next result"
                          disabled={searchResults.length <= 1}
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
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <button onClick={copyRoomLink} className="copy-button">
              Share Room
            </button>
            <button onClick={leaveRoom} className="leave-button">
              Leave Room
            </button>
          </div>
        </div>

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
                    isCurrentUser={message.sender === user.username}
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
                    className={`emoji-picker ${
                      emojiPickerHiding ? "hiding" : ""
                    }`}
                    ref={emojiPickerRef}
                  >
                    {commonEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className="emoji-item"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
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
      </div>

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
    </div>
  );
}

export default ChatRoom;
