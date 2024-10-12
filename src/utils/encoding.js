// Step 1: Remove special characters (only keep alphanumeric characters)
function removeSpecialCharacters(str) {
    return str.replace(/[^a-zA-Z0-9]/g, ''); // Removes everything except letters and numbers
}

// Step 2: Reverse the string
function reverseString(str) {
    return str.split('').reverse().join('');
}

// Step 3: XOR the reversed string with a secret key
function xorWithKey(input, key) {
    let xorResult = '';
    for (let i = 0; i < input.length; i++) {
        xorResult += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return xorResult;
}

// Step 4: Base64 encode the XOR-ed string
function base64Encode(str){
    return Buffer.from(str, 'binary').toString('base64');
}

// Final function: Encodes the URL as per your specification
function encodeUrl(original_url) {
    const secretKey = 'secretkey';

    // Step 1: Remove special characters
    const cleanedUrl = removeSpecialCharacters(original_url);

    // Step 2: Reverse the cleaned string
    const reversedUrl = reverseString(cleanedUrl);

    // Step 3: XOR the reversed string with the secret key
    const xorResult = xorWithKey(reversedUrl, secretKey);

    // Step 4: Base64 encode the XOR-ed string
    const base64Encoded = base64Encode(xorResult);

    return removeSpecialCharacters(base64Encoded);
}

// Example usage:
const original_url = "https://www.amgzon.com/";
const encodedUrl = encodeUrl(original_url);
console.log(`Encoded URL: ${encodedUrl}`); // Output will be a base64-encoded string
