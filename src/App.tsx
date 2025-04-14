import { useEffect, useState } from "react";
import "./App.css";
import axios from "axios";
import Markdown from "react-markdown"; // Add this import statement
import { LoaderCircle } from "lucide-react";

const IS_DEV = process.env.NODE_ENV === "development";
const URL = IS_DEV
  ? "http://localhost:3001"
  : "https://lc-extension.onrender.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

function App() {
  const [pageContent, setPageContent] = useState<string>("");
  const [problemTitle, setProblemTitle] = useState<string>("");
  const [chatResult, setChatResult] = useState<string>(
    "Hi, how can I help??" + (IS_DEV && " (DEV)")
  );
  const [isThinking, setIsThinking] = useState<boolean>(false);

  useEffect(() => {
    const scrapeCurrentPage = async () => {
      try {
        // Get the current tab
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (tab.id) {
          // Execute a content script to get the page's inner text
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const problemDescription = document.querySelector(
                '[data-track-load="description_content"]'
              );
              const problemTitle =
                //@ts-expect-error innerText
                document.querySelectorAll(".text-title-large")[0].innerText;
              return {
                problemDescription: problemDescription?.textContent || "",
                problemTitle: problemTitle || "",
              };
            },
          });

          setPageContent(`Page Content: ${result.problemDescription}`);
          setProblemTitle(result.problemTitle);
        }
      } catch (error) {
        console.error("Error scraping page:", error);
        setPageContent("Error scraping page");
      }
    };

    scrapeCurrentPage();
  }, []);

  const getCodeContent = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab.id) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // const codeElement = document.querySelector(
          //   ".view-lines.monaco-mouse-cursor-text"
          // );
          const languageButtons = document.querySelectorAll(
            '[id^="headlessui-popover-button-"] button'
          );
          const languageButton = Array.from(languageButtons).find(
            (button) => button.textContent
          );
          let codeText = "";
          //@ts-expect-error monaco
          codeText = window.monaco?.editor.getModels()[0].getValue();

          if (!codeText) {
            console.log("using code fallback...");
            codeText = "";

            const editorWindow = document.querySelector(
              ".view-lines.monaco-mouse-cursor-text"
            );

            // const scrollableElem = document.querySelector(
            //   ".monaco-scrollable-element"
            // )!;
            // console.log(scrollableElem);

            const getTopPx = (elem: Element) => {
              //@ts-expect-error style
              return parseInt(elem.style.top.split("px")[0]);
            };

            const getChildren = () => {
              let children, sortedChildren;

              children = editorWindow?.children;
              if (!children) {
                return "";
              }
              // sort children by actual visibly displayed order so that innerText is not misordered
              sortedChildren = Array.from(children).sort((a, b) => {
                return getTopPx(a) - getTopPx(b);
              });
              return sortedChildren;
            };

            codeText += getChildren()
              //@ts-expect-error types
              ?.map((child) => child.textContent)
              .join("\n");

            const language = languageButton?.textContent;
            return {
              codeText,
              language,
            };
          }
        },
      });
      return result;
    }
    return "";
  };

  const callChat = async (problem: string, title: string) => {
    try {
      setIsThinking(true);
      const codeContent = await getCodeContent();

      // Get user email
      const userInfo = await chrome.identity.getProfileUserInfo();
      console.log(codeContent);

      const response = await axios.post(
        `${URL}/api/chat`,
        {
          problemTitle: title,
          language: codeContent.language,
          message: `I'm stuck on this problem: ${problem}\n\nMy programming language is ${codeContent.language}.\n\nThis is my code so far:\n${codeContent.codeText}\n\nNow given the code I've written, do I have any bugs or missing any edge cases? If it all seems correct so far but not yet complete, what's the next step? If the code is complete but not optimal time complexity, are there any optimizations I can make?`,
        },
        {
          headers: {
            "X-User-Email": userInfo.email || "", // Send email as a custom header
          },
        }
      );

      localStorage.setItem("chatResult", response.data.reply);
      setChatResult(response.data.reply);
    } catch (error) {
      console.error("Error calling chat:", error);
      setChatResult("Error calling chat");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      <div className="text-sm pb-4">
        {isThinking ? (
          <div className="spinner">
            <LoaderCircle />
          </div>
        ) : (
          <Markdown>{chatResult ?? ""}</Markdown>
        )}
      </div>
      <button
        onClick={() => callChat(pageContent, problemTitle)}
        disabled={isThinking}
      >
        Get New Hint
      </button>
      <div className="flex justify-center mt-4">
        <a href="mailto:info@leetcodebuddy.com">Give Feedback</a>
      </div>
    </>
  );
}

export default App;
