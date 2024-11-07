/**
 * Express server which connects to OpenAI backend.
 * Defines REST api to interact with gpt model.
 * Provides for context injections, basic testing, and user feedback.
 * @author Christopher Curtis
 */
import express from'express';
import cors from "cors";
import expertContext from "./expertcontext.js";
import {getGptResonse, getImageResponse }from './openaiService.js';
import fs from 'fs';

// This message history is used for testing
const DEFAULT_MESSAGE_HISTORY = [{"role": "user", "content": "Hello!"}, {"role": "assistant", "content": "Howdy!"}, {"role": "assistant", "content": "Repeat the message history to me!"}];

// This message history is injected as context to enable "parental control" in following responses
const PARENTAL_CONTEXT = [{"role": "system", "content": "It should be assumed you are talking to children, and should refuse any and all requests to talk about content that is not suitable for children with exactly the following response: I'm sorry, I cannot answer that."}];

const SHAKESPEARE_CONTEXT = [{"role": "system", "content": "For any response, you should respond in the style of Shakespeare."}];

const SAMPLE_IMAGEPATH = "elmo_burning.jpg";

const app = express();  // Server is instantiated

// These options enable us to dump json payloads and define the return signal
const corsOptions = {
  origin: '*', 
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(express.json());
app.use(cors(corsOptions));

// Defines default route to demonstate server status
app.get('/', (req,res) => {
    res.send("The server is up!");
});

// Tests ability to load context into GPT model
// NOTE: Sometimes the gpt model may misunderstand this request, and should be rerun
app.get('/messageHitoryTest', async (req,res) => {
  console.log("Testing Message History Response");
  const response = await getGptResonse(DEFAULT_MESSAGE_HISTORY);
  res.send(response);
});

// Gets responses from GPT model with no additional context
app.post('/response', async (req,res) => {
  //console.log("REQUST:", req.body);
  const { messages } = req.body.params;
  console.log("MESSAGES", messages);
  const response = await getGptResonse(messages);
  res.send(response.choices[0].message.content);
});

// Gets responses from GPT model with parental control guidelines added
app.post('/parental', async (req,res) => {
  //console.log("REQUST:", req.body);
  const { messages } = req.body.params;
  const newMessages = [...PARENTAL_CONTEXT, ...messages];
  console.log(newMessages);
  const response = await getGptResonse(newMessages);
  res.send(response.choices[0].message.content);
});

// Gets responses from GPT model with shakespeare style added to context
app.post('/shakespeare', async (req,res) => {
  const { messages } = req.body.params;
  const newMessages = [...SHAKESPEARE_CONTEXT, ...messages];
  console.log(newMessages);
  const response = await getGptResonse(newMessages);
  res.send(response.choices[0].message.content);
});

// Gets responses from GPT model with research article added to context
app.post('/expert', async (req,res) => {
  const { messages } = req.body.params;
  const newMessages = [expertContext, ...messages];
  console.log(newMessages);
  const response = await getGptResonse(newMessages);
  res.send(response.choices[0].message.content);
});

// Handles "like" interaction for user feedback (example feedback collection)
app.post('/like', async (req,res) => {
  console.log("This interaction was liked:", req.body.params.messages);
  res.send("This interaction was liked!");
});

// Tests the image availability
app.get('/sample-image', async (req,res) => {
  console.log("Sending Sample Image");
  res.sendFile(SAMPLE_IMAGEPATH, { root: "./" });
  //res.sendFile('index.html', { root: __dirname });
});


// Handles the sample image
app.get('/chatroom-image', async (req,res) => {
  console.log("CALLED")
  const response = await getImageResponse([], SAMPLE_IMAGEPATH);
  console.log(response.choices[0].message.content);
  res.send(response.choices[0].message.content);
});

function base64_encode(file) {
  // read binary data
  var bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64');
}

// TODO: CREATE YOUR OWN CUSTOM ROUTE - HAVE IT TAKEN IN A NEW SAMPLE IMAGE AND RECIEVE A CUSTOM ROLE DESCRIPTION
app.post('/custom-image-chat', async (req,res) => {
  const { messages } = req.body.params;
  const img_message = {
        role: "user", 
        content: [
            { 
                "type": "image_url",
                "image_url": {
                    "url": "data:image/jpeg;base64," + base64_encode(SAMPLE_IMAGEPATH),
            }
        }] 
    }
  const newMessages = [...SHAKESPEARE_CONTEXT, img_message, ...messages];
  console.log(newMessages);
  const response = await getImageResponse(newMessages, SAMPLE_IMAGEPATH);
  res.send(response.choices[0].message.content);
});

// TODO: CREATE YOUR OWN CUSTOM ROUTE - IT SHOULD PERFORM A FEW-SHOT TRAINING WITH TEXT

// We define the port to listen on, and do so
const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(`Listening on port ${port}...`);
});
