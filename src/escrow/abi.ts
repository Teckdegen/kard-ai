export const ESCROW_ABI = [
  {
    type: "function",
    name: "makeStatement",
    stateMutability: "payable",
    inputs: [
      {
        name: "demand",
        type: "tuple",
        components: [
          { name: "arbiter", type: "address" },
          { name: "demand", type: "bytes" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
        ],
      },
      { name: "expiration", type: "uint64" },
    ],
    outputs: [{ name: "uid", type: "bytes32" }],
  },
  {
    type: "function",
    name: "collectPayment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowUID", type: "bytes32" },
      { name: "fulfillmentUID", type: "bytes32" },
    ],
    outputs: [{ name: "ok", type: "bool" }],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowUID", type: "bytes32" }],
    outputs: [{ name: "ok", type: "bool" }],
  },
  {
    type: "event",
    name: "EscrowMade",
    inputs: [
      { name: "uid", type: "bytes32", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "arbiter", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ARBITER_ABI = [
  {
    type: "function",
    name: "checkStatement",
    stateMutability: "view",
    inputs: [
      {
        name: "statement",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schema", type: "bytes32" },
          { name: "data", type: "bytes" },
          { name: "attester", type: "address" },
          { name: "recipient", type: "address" },
        ],
      },
      { name: "demand", type: "bytes" },
      { name: "counteroffer", type: "bytes32" },
    ],
    outputs: [{ name: "ok", type: "bool" }],
  },
] as const;
