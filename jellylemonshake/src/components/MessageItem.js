import React, { useState, useRef, useEffect } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/hljs";
import "../styles/components/MessageItem.css";

// Import language support
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp";
import csharp from "react-syntax-highlighter/dist/esm/languages/hljs/csharp";
import php from "react-syntax-highlighter/dist/esm/languages/hljs/php";
import typescript from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import html from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import css from "react-syntax-highlighter/dist/esm/languages/hljs/css";
import ruby from "react-syntax-highlighter/dist/esm/languages/hljs/ruby";
import swift from "react-syntax-highlighter/dist/esm/languages/hljs/swift";
import go from "react-syntax-highlighter/dist/esm/languages/hljs/go";

// Register languages
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("php", php);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("html", html);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("ruby", ruby);
SyntaxHighlighter.registerLanguage("swift", swift);
SyntaxHighlighter.registerLanguage("go", go);

function MessageItem({
  message,
  isCurrentUser,
  onTagMessage,
  isHovered,
  isHighlighted, // All matching search results
  isActiveHighlight, // Currently selected result
  onMouseEnter,
  onMouseLeave,
  roomColor,
}) {
  // Add state for copy button feedback
  const [copied, setCopied] = useState(false);
  // Add state for code/output toggle
  const [showOutput, setShowOutput] = useState(false);
  // Add state for loading while code is being executed
  const [executingCode, setExecutingCode] = useState(false);
  // Add state to store code execution output
  const [outputLines, setOutputLines] = useState([]);
  // Add state for user input in terminal
  const [userInput, setUserInput] = useState("");
  // Add state to track if code needs input
  const [awaitingInput, setAwaitingInput] = useState(false);
  // Reference for terminal input
  const terminalInputRef = useRef(null);
  // Reference for output container scrolling
  const outputContainerRef = useRef(null);
  // Add this for message animation reference
  const messageRef = useRef(null);

  // Scroll to bottom of output whenever it changes
  useEffect(() => {
    if (outputContainerRef.current) {
      outputContainerRef.current.scrollTop =
        outputContainerRef.current.scrollHeight;
    }
  }, [outputLines]);

  // Focus input when awaiting input
  useEffect(() => {
    if (awaitingInput && terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  }, [awaitingInput]);
  // Create a useEffect to handle message appearance animation reset
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.style.animation = "none";
      void messageRef.current.offsetWidth; // Trigger reflow
      messageRef.current.style.animation = "";
    }
  }, [message.id]);

  // Function to handle code copying
  const copyCodeToClipboard = () => {
    navigator.clipboard
      .writeText(message.text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      })
      .catch((err) => {
        console.error("Failed to copy code:", err);
      });
  };

  // Function to execute code - uses the actual code from message.text
  const executeCode = async () => {
    if (showOutput) {
      // Switch back to code view
      setShowOutput(false);
      return;
    }

    // Start execution
    setExecutingCode(true);
    setOutputLines([
      { text: `Compiling ${message.language} code...`, type: "info" },
    ]);
    setShowOutput(true);

    try {
      const codeToExecute = message.text;
      console.log(`🚀 Executing ${message.language} code:`, codeToExecute);

      // Call the backend API for code execution
      const apiUrl = process.env.REACT_APP_API_URL || 'https://awsfinalproject-backend.onrender.com';
      const response = await fetch(`${apiUrl}/api/jdoodle/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: codeToExecute,
          language: message.language
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Execution result:', result);

      // Display the output
      if (result.output) {
        setOutputLines([
          { text: `✅ Execution completed`, type: "success" },
          { text: "Output:", type: "info" },
          { text: result.output, type: "output" },
          ...(result.memory ? [{ text: `Memory: ${result.memory}`, type: "info" }] : []),
          ...(result.cpuTime ? [{ text: `CPU Time: ${result.cpuTime}`, type: "info" }] : [])
        ]);
      } else if (result.error) {
        setOutputLines([
          { text: "❌ Execution failed", type: "error" },
          { text: result.error, type: "error" }
        ]);
      }

      setExecutingCode(false);

    } catch (error) {
      console.error('Error executing code:', error);
      setOutputLines([
        { text: "❌ Error executing code", type: "error" },
        { text: error.message, type: "error" },
        { text: "Make sure the backend server is running and JDoodle API is configured.", type: "info" }
      ]);
      setExecutingCode(false);
    }
  };

  // Handle user input submission
  const handleInputSubmit = (e) => {
    e.preventDefault();

    if (!userInput.trim()) return;

    // Add user input to output display
    setOutputLines((prev) => [
      ...prev,
      {
        text: `> ${userInput}`,
        type: "command",
      },
    ]);

    // For demo, just acknowledge the input
    setOutputLines((prev) => [
      ...prev,
      {
        text: `Input "${userInput}" sent to the program`,
        type: "info",
      },
    ]);

    // Clear input field
    setUserInput("");
  };

  // Format timestamp
  const formattedTime = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
/*sohamghosh-jellylemonshake-23bps1146 */
  // Generate a unique ID for the message if it doesn't have one
  const messageId = message.id || new Date(message.timestamp).getTime();

  // Function to format message text with mentions
  const formatMessageWithMentions = (text) => {
    if (!text) return "";

    // Pattern to match @username format
    const mentionPattern = /@([a-zA-Z0-9_]+)/g;

    // Split the text by mention pattern and create parts array
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add the mention as a special span element
      parts.push(
        <span key={`mention-${match.index}`} className="user-mention">
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div
      className={`message-item ${isCurrentUser ? "current-user" : ""} ${
        isHovered ? "hovered" : ""
      } ${isHighlighted ? "highlighted" : ""} ${
        isActiveHighlight ? "active-highlight" : ""
      } ${message.local ? "local" : ""}`}
      onMouseEnter={() => onMouseEnter(messageId)}
      onMouseLeave={onMouseLeave}
    >
      {/*sohamghosh-jellylemonshake-23bps1146 *//* Always show sender name above message bubble */}
      <div
        className={`message-sender-name ${isCurrentUser ? "right" : "left"}`}
        style={{
          color:
            message.color ||
            (isCurrentUser ? "var(--light-text)" : "var(--secondary-color)"),
        }}
      >
        {message.user || message.senderName || "Anonymous"}
        {isCurrentUser && " (You)"}
      </div>

      <div
        ref={messageRef}
        className={`message-bubble ${message.isCode ? "code-message" : ""} ${
          executingCode ? "code-executing" : ""
        }`}
        style={{
          backgroundColor: message.isCode
            ? "#282a36"
            : isCurrentUser
            ? roomColor || "var(--primary-color)"
            : "var(--background-light)",
          borderColor: isHighlighted ? roomColor || "#1e88e5" : "transparent",
          borderWidth: isHighlighted ? "2px" : "0",
          boxShadow: isActiveHighlight
            ? `0 0 8px ${roomColor || "#1e88e5"}`
            : "none",
        }}
      >
        {/* Show tag button when hovered - MOVED INSIDE THE MESSAGE BUBBLE */}
        {isHovered && (
          <button
            className="tag-button"
            onClick={() => onTagMessage(message)}
            title="Reply to this message"
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
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </button>
        )}

        {/* Show reply info if this message is a reply */}
        {message.replyTo && (
          <div className="reply-indicator">
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
              <polyline points="9 14 4 9 9 4"></polyline>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
            </svg>
            <span className="reply-text">
              {message.replyTo.sender}:{" "}
              {message.replyTo.text.length > 30
                ? message.replyTo.text.substring(0, 30) + "..."
                : message.replyTo.text}
            </span>
          </div>
        )}

        {/* Code/Output toggle switch for code messages */}
        {message.isCode && (
          <div className="code-toggle-container">
            <div className="code-toggle-switch">
              <button
                className={`code-toggle-option ${!showOutput ? "active" : ""}`}
                onClick={() => setShowOutput(false)}
              >
                Code
              </button>
              <button
                className={`code-toggle-option ${showOutput ? "active" : ""}`}
                onClick={executeCode}
              >
                {executingCode ? "Running..." : "Output"}
              </button>
              <div
                className="code-toggle-slider"
                style={{
                  transform: showOutput ? "translateX(100%)" : "translateX(0)",
                }}
              ></div>
            </div>
          </div>
        )}

        {message.isCode ? (
          <div className="code-container">
            {/* Show either code or interactive output based on toggle state */}
            {!showOutput ? (
              <SyntaxHighlighter
                language={message.language || "javascript"}
                style={dracula}
                customStyle={{
                  margin: 0,
                  padding: "12px 15px",
                  borderRadius: "var(--border-radius)",
                  fontSize: "0.9rem",
                  backgroundColor: "transparent",
                  overflow: "auto",
                  maxWidth: "100%",
                  width: "100%",
                  wordBreak: "normal",
                  wordWrap: "normal",
                  whiteSpace: "pre",
                }}
                wrapLongLines={false}
              >
                {message.text}
              </SyntaxHighlighter>
            ) : (
              <div className="code-output">
                {executingCode ? (
                  <div className="code-loading">
                    <div className="loading-spinner"></div>
                    <span>Executing code...</span>
                  </div>
                ) : (
                  <>
                    <div className="terminal-output" ref={outputContainerRef}>
                      {outputLines.map((line, index) => (
                        <div
                          key={index}
                          className={`output-line ${line.type}-line`}
                        >
                          {line.text}
                        </div>
                      ))}
                    </div>

                    {awaitingInput && (
                      <form
                        onSubmit={handleInputSubmit}
                        className="terminal-input-container"
                      >
                        <span className="terminal-prompt">$</span>
                        <input
                          type="text"
                          className="terminal-input"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          ref={terminalInputRef}
                          placeholder="Type your input here..."
                        />
                        <button type="submit" className="terminal-submit">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                          </svg>
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="message-time code-time">{formattedTime}</div>
          </div>
        ) : (
          <>
            <div
              className="message-text"
              style={{
                color: isCurrentUser
                  ? "white"
                  : message.color || "var(--text-color)",
                whiteSpace: "pre-wrap", // This preserves whitespace and line breaks
              }}
            >
              {formatMessageWithMentions(message.text)}
            </div>
            <div className="message-time">{formattedTime}</div>
          </>
        )}

        { /*sohamghosh-jellylemonshake-23bps1146 Code options with language badge first, then copy button */}
        {message.isCode && message.language && (
          <div className="code-options-container">
            <div className="code-language-badge">{message.language}</div>
            <div className="code-action-buttons">
              <button
                className="code-action-button"
                onClick={copyCodeToClipboard}
                title="Copy code"
              >
                {copied ? (
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
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                ) : (
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
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageItem;
