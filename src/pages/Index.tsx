import { ChatContainer } from "@/components/chat/ChatContainer";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>VertexAI – Intelligent AI Assistant</title>
        <meta
          name="description"
          content="VertexAI is a powerful AI assistant for developers, engineers, and knowledge workers. Get expert help with coding, technical concepts, and complex problem-solving."
        />
      </Helmet>
      <ChatContainer />
    </>
  );
};

export default Index;
