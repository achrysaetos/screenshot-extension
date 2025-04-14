import fs from "fs";
import { stringSimilarity } from "string-similarity-js";

const CWD = process.cwd();
const leetcodeDir = `${CWD}/../leetcode`;
// do this once since might be expensive
const AllLeetcodeFiles = fs.readdirSync(leetcodeDir, {
  recursive: true,
});

export default function findSolution(params: {
  problemName: string;
  problemNumber: string;
  language: string;
}): { fileContent: string; lang: string } | null {
  // read all files from ./leetcode directory
  const renamedLang = {
    python3: "python",
    "c#": "csharp",
    "c++": "cpp",
  };
  const lang =
    renamedLang[params.language.toLowerCase()] || params.language.toLowerCase();
  // leftpad problemNumber to 4 digits
  const paddedProblemNumber = params.problemNumber.padStart(4, "0");
  let problemName = params.problemName;
  problemName = String(problemName).replaceAll(" ", "-");

  let files: string[] = [];
  let fileObjs: { fullName: string; friendlyName: string; lang: string }[] = [];

  // if dir of lang exists, get all files in that dir
  if (fs.existsSync(`${leetcodeDir}/${lang}`)) {
    files = fs.readdirSync(`${leetcodeDir}/${lang}`);
    // filter files by problem number
    files = files.filter((file) => file.startsWith(paddedProblemNumber));

    fileObjs = files.map((file) => ({
      fullName: file,
      friendlyName: file.replace(paddedProblemNumber, "").split(".")[0],
      lang,
    }));
  }

  if (!files.length) {
    console.log("fallback to searching whole leetcode folder");
    // then search whole leetcode folder for it
    files = AllLeetcodeFiles as string[];

    files = files.filter((file) => file.includes(paddedProblemNumber));

    fileObjs = files.map((file) => ({
      fullName: file.split("/")[1],
      friendlyName: file
        .split("/")[1]
        .replace(paddedProblemNumber, "")
        .split(".")[0],
      lang: file.split("/")[0],
    }));
  }

  if (!fileObjs.length) {
    return null;
  }

  // if many files, sort by string similarity to problem name

  const bestFile = fileObjs.sort((a, b) => {
    return (
      stringSimilarity(b.friendlyName, problemName) -
      stringSimilarity(a.friendlyName, problemName)
    );
  })[0];
  console.log(fileObjs.slice(0, 10));
  console.log(stringSimilarity(bestFile.friendlyName, problemName));

  // sanity check
  if (stringSimilarity(bestFile.friendlyName, problemName) < 0.7) {
    return null;
  }
  // read bestfile
  const fileContent = fs.readFileSync(
    `${leetcodeDir}/${bestFile.lang ?? lang}/${bestFile.fullName}`,
    "utf8"
  );
  return {
    fileContent,
    lang: bestFile.lang,
  };
}
