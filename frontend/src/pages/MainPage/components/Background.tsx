import bg from "../../../assets/kid_bg.png";

type Props = {
  children: React.ReactNode;
};

export default function Background({ children }: Props) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",       
        minHeight: 0,         
        overflow: "hidden",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {children}
    </div>
  );
}
