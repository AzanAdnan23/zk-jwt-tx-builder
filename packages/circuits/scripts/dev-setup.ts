/**
 *
 * This script is for generating zKey and Verification Key for the circuit.
 * Running this will download the phase1 file (if not already present),
 * generate the zKey, and also export solidity and json verification keys.
 *
 * Running this will overwrite any existing zKey and verification key files.
 *
 */

// @ts-ignore
import { zKey } from "snarkjs";
import https from "https";
import fs from "fs";
import path from "path";
import { program } from "commander";

program
  .requiredOption(
    "--output <string>",
    "Path to the directory storing output files"
  )
  .option("--silent", "No console logs")
  .option("--body", "Enable body parsing");

program.parse();
const args = program.opts();

function log(...message: any) {
  if (!args.silent) {
    console.log(...message);
  }
}


let { ZKEY_ENTROPY, ZKEY_BEACON } = process.env;
if (ZKEY_ENTROPY == null) {
  ZKEY_ENTROPY = "dev";
}
if (ZKEY_BEACON == null) {
  ZKEY_BEACON = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
}

let phase1Url =
  "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_22.ptau";
if (args.body) {
  phase1Url =
    "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_23.ptau";
}
// const buildDir = path.join(__dirname, "../build");
// const phase1Path = path.join(buildDir, "powersOfTau28_hez_final_21.ptau");
// const r1cPath = path.join(buildDir, "wallet.r1cs");
const solidityTemplate = path.join(
  require.resolve("snarkjs"),
  "../../templates/verifier_groth16.sol.ejs"
);

// Output paths
// const zKeyPath = path.join(buildDir, "wallet.zkey");
// const vKeyPath = path.join(buildDir, "vkey.json");
// const solidityVerifierPath = path.join(buildDir, "verifier.sol");


// async function askBeacon() {
//   if (!ZKEY_BEACON) {
//     ZKEY_BEACON = await new Promise((resolve) => {
//       const readline = require("readline").createInterface({
//         input: process.stdin,
//         output: process.stdout,
//       });
//       readline.question(
//         "Enter Beacon (hex string) to apply: ",
//         (entropy: string) => {
//           readline.close();
//           resolve(entropy);
//         }
//       );
//     });
//   }
// }

async function downloadPhase1(phase1Path: string) {
  if (!fs.existsSync(phase1Path)) {
    log(`✘ Phase 1 not found at ${phase1Path}`);
    log(`䷢ Downloading Phase 1`);

    const phase1File = fs.createWriteStream(phase1Path);

    return new Promise((resolve, reject) => {
      https
        .get(phase1Url, (response) => {
          response.pipe(phase1File);
          phase1File.on("finish", () => {
            phase1File.close();
            resolve(true);
          });
        })
        .on("error", (err) => {
          fs.unlink(phase1Path, () => { });
          reject(err);
        });
    });
  }
}

async function generateKeys(
  phase1Path: string,
  r1cPath: string,
  zKeyPath: string,
  vKeyPath: string,
  solidityVerifierPath: string
) {
  log(`✓ Generating ZKey for ${r1cPath}`);
  await zKey.newZKey(r1cPath, phase1Path, zKeyPath + ".step1", console);
  log("✓ Partial ZKey generated");

  await zKey.contribute(zKeyPath + ".step1", zKeyPath + ".step2", "Contributer 1", ZKEY_ENTROPY, console);
  log("✓ First contribution completed");

  // await askBeacon();
  await zKey.beacon(zKeyPath + ".step2", zKeyPath, "Final Beacon", ZKEY_BEACON, 10, console);
  log("✓ Beacon applied");

  await zKey.verifyFromR1cs(r1cPath, phase1Path, zKeyPath, console);
  log(`✓ Final ZKey verified - ${zKeyPath}`);

  const vKey = await zKey.exportVerificationKey(zKeyPath, console);
  fs.writeFileSync(vKeyPath, JSON.stringify(vKey, null, 2));
  log(`✓ Verification key exported - ${vKeyPath}`);

  const templates = {
    groth16: fs.readFileSync(solidityTemplate, "utf8"),
  };
  const code = await zKey.exportSolidityVerifier(zKeyPath, templates, console);
  fs.writeFileSync(solidityVerifierPath, code);
  log(`✓ Solidity verifier exported - ${solidityVerifierPath}`);
  fs.rmSync(zKeyPath + ".step1");
  fs.rmSync(zKeyPath + ".step2");
}

async function exec() {
  const buildDir = args.output;


  if (!args.body) {
    const phase1Path = path.join(buildDir, "powersOfTau28_hez_final_22.ptau");

    await downloadPhase1(phase1Path);
    log("✓ Phase 1:", phase1Path);

    const emailAuthR1csPath = path.join(buildDir, "jwt-verifier.r1cs");
    if (!fs.existsSync(emailAuthR1csPath)) {
      throw new Error(`${emailAuthR1csPath} does not exist.`);
    }
    await generateKeys(phase1Path, emailAuthR1csPath, path.join(buildDir, "jwt-verifier.zkey"), path.join(buildDir, "jwt-verifier.vkey"), path.join(buildDir, "JwtGroth16Verifier.sol"));
    log("✓ Keys for email auth circuit generated");
  } else {
    const phase1Path = path.join(buildDir, "powersOfTau28_hez_final_23.ptau");

    await downloadPhase1(phase1Path);
    log("✓ Phase 1:", phase1Path);

    const emailAuthR1csPath = path.join(buildDir, "email_auth_with_body_parsing_with_qp_encoding.r1cs");
    if (!fs.existsSync(emailAuthR1csPath)) {
      throw new Error(`${emailAuthR1csPath} does not exist.`);
    }
    await generateKeys(phase1Path, emailAuthR1csPath, path.join(buildDir, "email_auth_with_body_parsing_with_qp_encoding.zkey"), path.join(buildDir, "email_auth_with_body_parsing_with_qp_encoding.vkey"), path.join(buildDir, "Groth16BodyParsingVerifier.sol"));
    log("✓ Keys for email auth with body parsing circuit generated");
  }

}


exec()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log("Error: ", err);
    process.exit(1);
  });
