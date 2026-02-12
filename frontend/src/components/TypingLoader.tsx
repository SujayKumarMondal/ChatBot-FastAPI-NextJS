
const TypingLoader = () => {
  return (
    <div className="flex items-center space-x-2 px-4 py-2">
      <img 
        src="/brand_logo.png" 
        alt="ChatPaat" 
        className="h-6 w-6 animate-pulse" 
      />
      <div className="flex space-x-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
      </div>
    </div>
  )
}

export default TypingLoader