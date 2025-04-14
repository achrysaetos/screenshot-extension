import OpenAI from "openai";
import Markdown from "react-markdown";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import "./App.css";

const openai = new OpenAI({
  apiKey: "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",
  dangerouslyAllowBrowser: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any;

function App() {
  const [chatResult, setChatResult] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);

  useEffect(() => {
    const initExtension = async () => {
      const screenshot = await takeScreenshot();
      if (screenshot) {
        await callChat(screenshot);
      }
    };

    initExtension();
  }, []);

  const takeScreenshot = async (): Promise<string | null> => {
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
        
        return screenshot;
      }
      return null;
    } catch (error) {
      console.error("Error taking screenshot:", error);
      return null;
    }
  };

  const callChat = async (imageData: string) => {
    try {
      setIsThinking(true);
      const response = await openai.responses.create({
          model: "gpt-4o-mini",
          input: [
              {
                  role: "user",
                  content: [
                      { type: "input_text", text: "Give me specific insights, tips, or analysis. (3 sentences max)" },
                      {
                          type: "input_image",
                          image_url: imageData,
                          detail: "low",
                      },
                  ],
              },
          ],
      });
      
      setChatResult(response.output_text);
    } catch (error) {
      setChatResult("Error calling chat: " + error);
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
      <div className="flex justify-center">
        <a href="mailto:info@leetcodebuddy.com">Give Feedback</a>
      </div>
    </>
  );
}

export default App;
