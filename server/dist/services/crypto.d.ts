export declare function generateKeyPair(): {
    publicKey: string;
    privateKey: string;
};
export declare function getPublicKey(): string | null;
export declare function getPrivateKey(): string | null;
export declare function encryptWithPublicKey(data: string, publicKey: string): string;
export declare function decryptWithPrivateKey(encryptedData: string, privateKey: string): string;
export declare function initCrypto(): void;
