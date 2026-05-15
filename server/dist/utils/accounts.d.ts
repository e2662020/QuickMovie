interface TestAccount {
    username: string;
    password: string;
    roles: string[];
    status: boolean;
}
export declare function loadTestAccounts(): TestAccount[];
export {};
