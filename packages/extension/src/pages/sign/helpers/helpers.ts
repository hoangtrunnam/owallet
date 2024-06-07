import { ethers } from "ethers";

export const tryAllABI = (
  signData,
  ABI: Array<any>
): {
  isRaw: boolean;
  data: any;
} => {
  if (ABI.length === 0) {
    return {
      isRaw: true,
      data: signData,
    };
  }

  const currentABI = ABI[0];
  try {
    const iface = new ethers.utils.Interface(currentABI);
    const decodedData = iface.parseTransaction({ data: signData });
    return {
      isRaw: false,
      data: decodedData,
    };
  } catch (error) {
    console.log(`Parse with ABI not success: ${error.message}`);
    return tryAllABI(signData, ABI.slice(1));
  }
};

export const calculateJaccardIndex = (str1, str2) => {
  // const set1 = new Set(str1.split(""));
  // const set2 = new Set(str2.split(""));

  // const intersection = new Set([...set1].filter(char => set2.has(char)));
  // const union = new Set([...set1, ...set2]);

  // return intersection.size / union.size;
  // Remove any whitespace and convert to lowercase
  str1 = str1.replace(/\s/g, "").toLowerCase();
  str2 = str2.replace(/\s/g, "").toLowerCase();

  // Initialize the intersection and union counts
  let intersection = 0;
  let union = 0;

  // Iterate through the characters and count the intersection and union
  for (let i = 0; i < Math.max(str1.length, str2.length); i++) {
    if (str1[i] === str2[i]) {
      intersection++;
    }
    if (str1[i] || str2[i]) {
      union++;
    }
  }

  // Calculate the Jaccard Index
  return intersection / union;
};

export const findKeyBySimilarValue = (obj, value) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (obj[key] === value) {
        return key;
      } else if (calculateJaccardIndex(obj[key], value) > 0.9) {
        return key;
      }
    }
  }
  return null; // Return null if the value is not found in the object
};
