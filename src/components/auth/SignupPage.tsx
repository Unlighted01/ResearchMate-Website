import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import { Button, Card, Input } from "../shared/UIComponents";

interface SignupProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
    ToastComponent: React.ReactNode;
  };
}

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
};

const SignupPage: React.FC<SignupProps> = ({ useToast }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const score = getPasswordStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return showToast("Password too short", "error");

    setLoading(true);
    localStorage.setItem(
      "researchmate_remember",
      rememberMe ? "true" : "false"
    );

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Account created! Check your email.", "success");
      setTimeout(() => navigate("/login"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create an account
          </h2>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <div className="flex gap-1 mt-2 h-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${
                      i <= score
                        ? score < 3
                          ? "bg-red-500"
                          : "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 text-primary-600"
            />
            Keep me signed in
          </label>
          <Button type="submit" className="w-full" isLoading={loading}>
            Sign Up
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-600 font-semibold">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default SignupPage;
