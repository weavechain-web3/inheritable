import solcx
import web3
import json
from eth_keyfile import extract_key_from_keyfile

#ETH_NODE = "https://rpc-mumbai.maticvigil.com"
#CHAIN_ID = 80001

ETH_NODE = "https://goerli.base.org"
CHAIN_ID = 84531

CLASS_NAME = "Inheritance"
DEPLOY_CFG = "deploy.json"


with open(DEPLOY_CFG, "r") as f:
        cfg = json.load(f)
ACCOUNT = cfg['account']
PASS = cfg['pass']
PRIVATE_KEY_FILE = cfg.get('key')
PRIVATE_KEY = None
PRIVATE_KEY_PASS = cfg.get('keypass')
print("Deploying for " + ACCOUNT)

if PRIVATE_KEY_FILE is not None:
        with open(PRIVATE_KEY_FILE, "r") as f:
                PRIVATE_KEY = f.read()

SOURCE = CLASS_NAME + ".sol"
ABI_FILE = CLASS_NAME + "_abi.json"
BINARY_FILE = CLASS_NAME + ".bin"
CONTRACT_FILE = CLASS_NAME + "_address_testnet.txt"


spec = {
        "language": "Solidity",
        "sources": { SOURCE: { "urls": [ SOURCE ] } },
        "settings": { "optimizer": { "enabled": True }, "outputSelection": { "*": { "*": [ "metadata", "evm.bytecode", "abi" ] } } }
}

print("Compiling...")
contract = solcx.compile_standard(spec, allow_paths=".")

abi = contract['contracts'][SOURCE][CLASS_NAME]['abi']
bytecode = contract['contracts'][SOURCE][CLASS_NAME]['evm']['bytecode']['object']

with open(ABI_FILE, 'w') as f:
        f.write(json.dumps(abi))

with open(BINARY_FILE, 'w') as f:
	f.write(bytecode)

print("Connecting...")
w3 = web3.Web3(web3.HTTPProvider(ETH_NODE))
w3.middleware_onion.inject(web3.middleware.geth_poa_middleware, layer=0)

print("Deploy contract...")
me = ACCOUNT
pvk = extract_key_from_keyfile(PRIVATE_KEY_FILE, PASS)
nonce = w3.eth.getTransactionCount(ACCOUNT)

temp = w3.eth.contract(bytecode=bytecode, abi=abi)
txn = temp.constructor().buildTransaction({"chainId": CHAIN_ID, "from": me, "gas": 10000, "nonce": nonce})


signed_tx = w3.eth.account.signTransaction(txn, private_key=pvk.hex())
txn_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
txn_receipt = w3.eth.wait_for_transaction_receipt(txn_hash, timeout=600)
address = txn_receipt['contractAddress']

print("Deployed.")
print(address)

with open(CONTRACT_FILE, 'w') as f:
        f.write(address)

