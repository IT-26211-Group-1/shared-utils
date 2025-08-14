import { KMSClient, GenerateDataKeyCommand } from "@aws-sdk/client-kms";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const kms = new KMSClient({});
const ssm = new SSMClient({});

let cachedPepper: string | null = null;
let cachedKeyArn: string | null = null;

async function getKmsKey(): Promise<string> {
  if (cachedKeyArn) return cachedKeyArn;

  const res = await ssm.send(
    new GetParameterCommand({
      Name: "/adultna/kms/password-key-arn",
      WithDecryption: true,
    })
  );

  if (!res.Parameter?.Value) throw new Error("Missing KMS ARN from SSM");

  cachedKeyArn = res.Parameter.Value;
  return cachedKeyArn;
}

/**
 * Returns the cached pepper for hashing passwords
 */
export async function getPepper(): Promise<string> {
  if (cachedPepper) return cachedPepper;

  const keyArn = await getKmsKey();

  const dataKey = await kms.send(
    new GenerateDataKeyCommand({
      KeyId: keyArn,
      KeySpec: "AES_256",
    })
  );

  if (!dataKey.Plaintext) throw new Error("Failed to generate data key");

  cachedPepper = Buffer.from(dataKey.Plaintext).toString("base64");
  return cachedPepper;
}
