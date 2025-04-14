import { useEffect, useState } from "react";
import "./App.css";
import Markdown from "react-markdown"; // Add this import statement
import { LoaderCircle } from "lucide-react";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
  dangerouslyAllowBrowser: true,
});

const IS_DEV = process.env.NODE_ENV === "development";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

function App() {
  const [chatResult, setChatResult] = useState<string>(
    "Hi, how can I help??" + (IS_DEV && " (DEV)")
  );
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);

  console.log(screenshotData);

  useEffect(() => {
    const initExtension = async () => {
      await takeScreenshot();
    };

    initExtension();
  }, []);

  const takeScreenshot = async () => {
    try {
      // Get the current tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab.id) {
        // Capture visible tab
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
          format: "png",
        });
        
        setScreenshotData(screenshot);
        
        // Download the screenshot
        const a = document.createElement("a");
        a.href = screenshot;
        a.download = `screenshot_${new Date().getTime()}.png`;
        a.click();
      }
    } catch (error) {
      console.error("Error taking screenshot:", error);
    }
  };

  const callChat = async () => {
    try {
      setIsThinking(true);
      const response = await openai.responses.create({
          model: "gpt-4o-mini",
          input: [
              {
                  role: "user",
                  content: [
                      { type: "input_text", text: "what's your opinion? (3 sentences max)" },
                      {
                          type: "input_image",
                          image_url: screenshotData,
                          detail: "low",
                      },
                  ],
              },
          ],
      });
      
      console.log(response.output_text);
      setChatResult(response.output_text);
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
        onClick={() => callChat()}
        disabled={isThinking}
      >
        Get New Hint
      </button>
      <button
        onClick={takeScreenshot}
        className="ml-2 bg-blue-500 hover:bg-blue-600 text-white"
      >
        Take Screenshot
      </button>
      <div className="flex justify-center mt-4">
        <a href="mailto:info@leetcodebuddy.com">Give Feedback</a>
      </div>
    </>
  );
}

export default App;
