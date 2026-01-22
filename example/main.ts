import {createClient} from 'bedrock-protocol'
import type { MCProtocol } from './types/Bedrock_1_21_130.js'

const client = createClient() as unknown as MCProtocol.Bedrock_1_21_130.BedrockClient