export declare function isQuantumEnabled(): boolean;
export declare function generateQuantumKeyPair(): {
    publicKey: string;
    privateKey: string;
};
export declare function quantumEncapsulate(publicKey: string): {
    ciphertext: string;
    sharedSecret: string;
};
export declare function quantumDecapsulate(ciphertext: string, privateKey: string): string;
