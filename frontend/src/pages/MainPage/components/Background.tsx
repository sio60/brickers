import bg from "../../../assets/bg.png";

type Props = {
  children: React.ReactNode;
};

export default function Background({ children }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
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
