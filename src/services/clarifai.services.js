const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");

class ClarifaiService {
  constructor() {
    this.stub = ClarifaiStub.grpc();
    this.metadata = new grpc.Metadata();
    this.metadata.set("authorization", `Key ${process.env.CLARIFAI_API_KEY}`);
    
    // Food Model ID
    this.foodModelId = "bd367be194cf45149e75f01d59f77ba7";
    
    this.userId = process.env.CLARIFAI_USER_ID;     
    this.appId = "main"; 
  }

  async recognizeFoodFromUrl(imageUrl) {
    return new Promise((resolve, reject) => {
      const requestData = {
        user_app_id: {
          user_id: "clarifai",
          app_id: "main"
        },
        model_id: this.foodModelId,
        inputs: [{ data: { image: { url: imageUrl } } }]
      };

      this.stub.PostModelOutputs(requestData, this.metadata, (err, response) => {
        if (err) {
          console.error("gRPC Error:", err);
          reject(new Error("Failed to connect to Clarifai API"));
          return;
        }

        if (response.status.code !== 10000) {
          console.error("Clarifai API Error:", response.status);
          reject(new Error(`Clarifai API error: ${response.status.description}`));
          return;
        }

        const concepts = response.outputs[0].data.concepts;
        const foods = concepts.map(concept => ({
          name: concept.name,
          confidence: concept.value,
          isReliable: concept.value > 0.8
        }));

        resolve(foods);
      });
    });
  }

  async recognizeFoodFromBytes(imageBytes) {
    console.log("1. Received imageBytes:", imageBytes ? imageBytes.length : "undefined");
    
    if (!imageBytes || imageBytes.length === 0) {
      throw new Error("No image data provided");
    }

    const base64Image = imageBytes.toString('base64');

    console.log("2. Base64 length:", base64Image.length);
    console.log("3. Base64 preview:", base64Image.substring(0, 50));
    
    return new Promise((resolve, reject) => {
      const requestData = {
        user_app_id: {
          user_id: "clarifai",
          app_id: "main"
        },
        model_id: this.foodModelId,
        inputs: [{ data: { image: { base64: base64Image } } }]
      };

      this.stub.PostModelOutputs(requestData, this.metadata, (err, response) => {
        if (err) {
          console.error("gRPC Error:", err);
          reject(new Error("Failed to connect to Clarifai API"));
          return;
        }

        if (response.status.code !== 10000) {
          console.error("Clarifai API Error:", response.status);
          reject(new Error(`Clarifai API error: ${response.status.description}`));
          return;
        }

        const concepts = response.outputs[0].data.concepts;
        const foods = concepts.map(concept => ({
          name: concept.name,
          confidence: concept.value,
          isReliable: concept.value > 0.8
        }));

        resolve(foods);
      });
    });
  }
}

module.exports = new ClarifaiService();