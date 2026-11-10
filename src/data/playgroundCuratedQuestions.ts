// ============================================
// PLAYGROUND CURATED QUESTIONS POOL
// 50 Authentic, High-Rigor Academic Questions Across Diverse Fields:
// - Computer Science & AI
// - Mathematics & Statistics
// - Biomedical & Life Sciences
// - Physics & Space Sciences
// - Chemistry & Materials
// - Economics & Game Theory
// - Philosophy & Formal Logic
// - Earth & Environmental Systems
// ============================================

export interface CuratedPlaygroundQuestion {
  id: string;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subject: string;
  topic: string;
}

export const PLAYGROUND_CURATED_QUESTIONS: CuratedPlaygroundQuestion[] = [
  // -------------------------------------------------------------
  // 1. COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE (8 Questions)
  // -------------------------------------------------------------
  {
    id: "cs-01",
    subject: "Computer Science & AI",
    topic: "Transformer Architectures",
    stem: "In standard Transformer Multi-Head Self-Attention, what is the primary algorithmic cause of the quadratic O(N²) computational and memory complexity with respect to sequence length N?",
    options: [
      "The linear projection matrices W_Q, W_K, and W_V applied to token embeddings",
      "The dot-product materialization of the query-key affinity matrix (Q · K^T) of size N × N",
      "The element-wise feed-forward layer expanding dimensions to 4× model width",
      "The positional sinusoidal encoding added during embedding lookup",
    ],
    correctIndex: 1,
    explanation:
      "Self-attention computes Q · K^T resulting in an intermediate attention score matrix of dimensions N × N before softmax normalization, requiring O(N²) compute and memory bandwidth.",
  },
  {
    id: "cs-02",
    subject: "Computer Science & AI",
    topic: "Complexity Theory",
    stem: "Which of the following computational problems is proven to be in P (solvable in deterministic polynomial time)?",
    options: [
      "Determining whether a given integer is prime (PRIMES)",
      "Boolean Satisfiability (3-SAT)",
      "Traveling Salesperson Decision Problem (TSP)",
      "Graph 3-Colorability",
    ],
    correctIndex: 0,
    explanation:
      "The AKS primality test (Agrawal, Kayal, Saxena, 2002) proved that determining primality is unconditionally in P (specifically O~(log^6 n)), whereas 3-SAT, TSP, and 3-Colorability are NP-complete.",
  },
  {
    id: "cs-03",
    subject: "Computer Science & AI",
    topic: "Operating Systems",
    stem: "In distributed operating systems and database theory, what does the CAP theorem assert regarding partition tolerance (P)?",
    options: [
      "A distributed system can guarantee both strong consistency and high availability even during network partitions",
      "A distributed system experiencing an arbitrary network partition must choose between Consistency (C) and Availability (A)",
      "Network partitions can always be eliminated using synchronous hardware clock synchronization",
      "Availability can only be maintained if the system completely halts client writes",
    ],
    correctIndex: 1,
    explanation:
      "Brewer's CAP theorem states that in the presence of a network partition (P), a distributed data store can preserve either Consistency (every read receives the most recent write or an error) or Availability (every non-failing node returns a response), but not both.",
  },
  {
    id: "cs-04",
    subject: "Computer Science & AI",
    topic: "Machine Learning Optimization",
    stem: "Why does the Adam (Adaptive Moment Estimation) optimizer maintain both the first and second raw moment estimates (m_t and v_t) of past gradients?",
    options: [
      "To calculate the exact Hessian curvature matrix without backpropagation",
      "To adapt individual parameter learning rates based on moving averages of direction and uncentered variance",
      "To prevent overfitting by dynamically pruning near-zero synaptic weights",
      "To force all layer activations to conform to a Gaussian unit normal distribution",
    ],
    correctIndex: 1,
    explanation:
      "Adam tracks exponential moving averages of gradients (first moment m_t for momentum) and squared gradients (second raw moment v_t for scaling), enabling per-parameter adaptive learning rates resilient to sparse or noisy gradients.",
  },
  {
    id: "cs-05",
    subject: "Computer Science & AI",
    topic: "Data Structures",
    stem: "What is the worst-case time complexity of searching for an element in an Red-Black Tree containing n keys?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctIndex: 1,
    explanation:
      "A Red-Black tree guarantees that the longest path from root to leaf is at most twice the shortest path, strictly bounding tree height to ≤ 2 log_2(n + 1). Hence, search is strictly O(log n) in the worst case.",
  },
  {
    id: "cs-06",
    subject: "Computer Science & AI",
    topic: "Networking & Security",
    stem: "In public-key cryptography, on what hard mathematical assumption is the Diffie-Hellman Key Exchange primarily based?",
    options: [
      "The computational difficulty of calculating the Discrete Logarithm in a cyclic group",
      "The asymptotic hardness of finding shortest vectors in high-dimensional lattices",
      "The polynomial-time unsolvability of the Knapsack subset-sum problem",
      "The non-invertibility of SHA-256 cryptographic hash expansions",
    ],
    correctIndex: 0,
    explanation:
      "Diffie-Hellman security relies on the Computational Diffie-Hellman (CDH) assumption and the intractability of the Discrete Logarithm Problem (DLP) over finite fields or elliptic curve groups.",
  },
  {
    id: "cs-07",
    subject: "Computer Science & AI",
    topic: "Compiler Design",
    stem: "In modern optimizing compilers, what is the core benefit of transforming intermediate code into Static Single Assignment (SSA) form?",
    options: [
      "It compresses machine instructions into half-precision bytecode for mobile execution",
      "Every variable is assigned exactly once, simplifying dataflow analysis and dead code elimination",
      "It guarantees that recursive functions are automatically converted to iterative loops",
      "It eliminates the need for symbol tables and type checking passes",
    ],
    correctIndex: 1,
    explanation:
      "In SSA form, each variable is defined exactly once and φ-functions join values at control-flow mergers. This makes def-use chains explicit, vastly optimizing constant propagation, register allocation, and dead-code elimination.",
  },
  {
    id: "cs-08",
    subject: "Computer Science & AI",
    topic: "Deep Learning Architectures",
    stem: "What critical function do residual skip connections (x + F(x)) serve in deep Convolutional and Transformer networks?",
    options: [
      "They allow gradients to propagate directly backward through identity mappings, mitigating vanishing gradients",
      "They double the total parameter count without increasing forward FLOPs",
      "They eliminate the need for activation functions like ReLU or GELU",
      "They enforce orthogonal weight matrices across all hidden layers",
    ],
    correctIndex: 0,
    explanation:
      "ResNet skip connections allow gradient signals to backpropagate directly across identity paths without multiplicative degradation through weight matrices, enabling effective training of networks with hundreds of layers.",
  },

  // -------------------------------------------------------------
  // 2. MATHEMATICS & STATISTICS (7 Questions)
  // -------------------------------------------------------------
  {
    id: "math-01",
    subject: "Mathematics & Statistics",
    topic: "Linear Algebra",
    stem: "If a real square matrix A is symmetric (A = A^T), what does the Spectral Theorem guarantee regarding its eigenvalues and eigenvectors?",
    options: [
      "All eigenvalues are purely imaginary and eigenvectors are skew-symmetric",
      "All eigenvalues are real, and there exists an orthonormal basis of eigenvectors",
      "The trace of A must equal zero and all eigenvalues are strictly positive",
      "A cannot be diagonalized unless its determinant is exactly 1",
    ],
    correctIndex: 1,
    explanation:
      "The Spectral Theorem for real symmetric matrices states that all eigenvalues are real and that eigenvectors corresponding to distinct eigenvalues are orthogonal, allowing A to be orthogonally diagonalized as Q Λ Q^T.",
  },
  {
    id: "math-02",
    subject: "Mathematics & Statistics",
    topic: "Probability Theory",
    stem: "According to Bayes' Theorem, if event A has prior probability P(A) = 0.01, P(B|A) = 0.90, and P(B|¬A) = 0.05, what is the posterior probability P(A|B)?",
    options: ["Approximately 15.4%", "Exactly 90.0%", "Approximately 50.0%", "Less than 1.0%"],
    correctIndex: 0,
    explanation:
      "P(B) = P(B|A)P(A) + P(B|¬A)P(¬A) = (0.90)(0.01) + (0.05)(0.99) = 0.009 + 0.0495 = 0.0585. Thus P(A|B) = 0.009 / 0.0585 ≈ 0.1538 (15.4%).",
  },
  {
    id: "math-03",
    subject: "Mathematics & Statistics",
    topic: "Multivariable Calculus",
    stem: "What does the divergence theorem (Gauss's Theorem) establish between a smooth vector field F and a closed boundary surface S bounding volume V?",
    options: [
      "The outward flux of F across S equals the volume integral of the divergence of F throughout V",
      "The circulation of F along a closed contour equals the surface curl integral",
      "The gradient of F vanishes everywhere on the boundary surface",
      "The volume integral of F is invariant under all coordinate rotations",
    ],
    correctIndex: 0,
    explanation:
      "Gauss's Divergence Theorem states that ∬_S (F · n) dS = ∭_V (∇ · F) dV, linking surface boundary flux directly to internal source density.",
  },
  {
    id: "math-04",
    subject: "Mathematics & Statistics",
    topic: "Statistical Inference",
    stem: "Under the Central Limit Theorem (CLT), what happens to the distribution of sample means x̄ as sample size n increases for independent and identically distributed (i.i.d.) variables with finite variance σ²?",
    options: [
      "The distribution converges in distribution to a Normal distribution with variance σ²/n",
      "The sample mean converges to a uniform distribution between -σ and +σ",
      "The variance increases proportionally with the square root of n",
      "The mean shifts towards the sample median rather than population mean μ",
    ],
    correctIndex: 0,
    explanation:
      "The CLT establishes that regardless of the underlying population distribution, the normalized sum √n(x̄ - μ) converges in distribution to N(0, σ²), meaning x̄ ~ N(μ, σ²/n).",
  },
  {
    id: "math-05",
    subject: "Mathematics & Statistics",
    topic: "Discrete Mathematics",
    stem: "In graph theory, what necessary and sufficient condition allows a connected undirected graph to contain an Eulerian circuit (a closed trail visiting every edge exactly once)?",
    options: [
      "The graph must be bipartite and planar",
      "Every vertex must have an even degree",
      "The graph must contain a Hamiltonian cycle",
      "The number of vertices must be a prime number",
    ],
    correctIndex: 1,
    explanation:
      "Euler proved in 1736 that a connected finite graph has an Eulerian circuit if and only if every vertex has an even degree (in-degree equals out-degree in undirected terms).",
  },
  {
    id: "math-06",
    subject: "Mathematics & Statistics",
    topic: "Complex Analysis",
    stem: "What is the value of the contour integral ∮_C (1 / z) dz along the unit circle C oriented counterclockwise centered at the origin?",
    options: ["0", "1", "2πi", "π / 2"],
    correctIndex: 2,
    explanation:
      "By Cauchy's Residue Theorem or direct parametrization z = e^(iθ), dz = i e^(iθ) dθ, the integral yields ∫_0^(2π) (i e^(iθ) / e^(iθ)) dθ = ∫_0^(2π) i dθ = 2πi.",
  },
  {
    id: "math-07",
    subject: "Mathematics & Statistics",
    topic: "Differential Equations",
    stem: "What is the general solution to the homogeneous second-order ordinary differential equation y'' + 4y = 0?",
    options: [
      "y(t) = C_1 e^(2t) + C_2 e^(-2t)",
      "y(t) = C_1 cos(2t) + C_2 sin(2t)",
      "y(t) = C_1 t^2 + C_2 t",
      "y(t) = (C_1 + C_2 t) e^(4t)",
    ],
    correctIndex: 1,
    explanation:
      "The characteristic equation is r² + 4 = 0, giving roots r = ±2i. For purely imaginary roots ±iβ, the general real solution is C_1 cos(2t) + C_2 sin(2t).",
  },

  // -------------------------------------------------------------
  // 3. BIOMEDICAL & LIFE SCIENCES (7 Questions)
  // -------------------------------------------------------------
  {
    id: "bio-01",
    subject: "Biomedical & Life Sciences",
    topic: "Molecular Biology",
    stem: "During eukaryotic DNA replication, why are Okazaki fragments formed exclusively on the lagging strand rather than the leading strand?",
    options: [
      "DNA polymerases can only synthesize polynucleotide chains in the 5' to 3' direction",
      "RNA primers cannot bind to leading template strands",
      "Topoisomerase inhibits continuous synthesis on the parent 3' end",
      "The lagging strand lacks nucleotide excision repair enzymes",
    ],
    correctIndex: 0,
    explanation:
      "DNA polymerase requires a free 3'-OH group to catalyze phosphodiester bond formation, restricting synthesis strictly to 5' → 3'. As replication forks open, the lagging strand must be synthesized discontinuously in retrograde fragments.",
  },
  {
    id: "bio-02",
    subject: "Biomedical & Life Sciences",
    topic: "Cellular Metabolism",
    stem: "In aerobic cellular respiration, what directly drives the synthesis of ATP by mitochondrial ATP synthase (Complex V)?",
    options: [
      "The electrochemical proton gradient (proton-motive force) across the inner mitochondrial membrane",
      "The direct enzymatic transfer of phosphate groups from glucose to ADP",
      "The reduction of NAD+ to NADH in the cytoplasm",
      "The breakdown of carbon dioxide molecules in the mitochondrial matrix",
    ],
    correctIndex: 0,
    explanation:
      "Chemiosmosis (Mitchell hypothesis): Complexes I, III, and IV pump protons into the intermembrane space, creating a proton-motive force. As protons flow back into the matrix through F_o, rotational torque synthesizes ATP in F_1.",
  },
  {
    id: "bio-03",
    subject: "Biomedical & Life Sciences",
    topic: "Genetics & CRISPR",
    stem: "In the CRISPR-Cas9 genome editing system, what is the mandatory function of the Protospacer Adjacent Motif (PAM)?",
    options: [
      "It serves as a 2-6 base pair recognition sequence required for Cas9 binding before target strand unwinding",
      "It transcribes the guide RNA sequence into functional mRNA inside the nucleus",
      "It prevents donor template DNA from participating in homology-directed repair",
      "It marks the host bacterium's own CRISPR array for destruction",
    ],
    correctIndex: 0,
    explanation:
      "Cas9 will not cleave DNA without an adjacent PAM sequence (e.g. 5'-NGG for SpCas9). The PAM interaction initiates local DNA melting, allowing the gRNA spacer to test for complementary base pairing.",
  },
  {
    id: "bio-04",
    subject: "Biomedical & Life Sciences",
    topic: "Immunology",
    stem: "What is the primary immunological difference between Major Histocompatibility Complex (MHC) Class I and Class II molecules?",
    options: [
      "MHC Class I presents endogenous cytosolic antigens to CD8+ cytotoxic T cells, while MHC Class II presents exogenous antigens to CD4+ helper T cells",
      "MHC Class I is found exclusively on B lymphocytes and dendritic cells",
      "MHC Class II molecules lack transmembrane anchor domains",
      "MHC Class I activates innate macrophages while MHC Class II only triggers apoptosis",
    ],
    correctIndex: 0,
    explanation:
      "MHC Class I is expressed on all nucleated cells, presenting intracellular peptides to CD8+ T cells. MHC Class II is restricted to professional antigen-presenting cells (dendritic cells, macrophages, B cells), presenting engulfed antigens to CD4+ T cells.",
  },
  {
    id: "bio-05",
    subject: "Biomedical & Life Sciences",
    topic: "Neuroscience",
    stem: "During a neuronal action potential, what biophysical event is responsible for the rapid repolarization phase following the peak voltage (+30 mV)?",
    options: [
      "Inactivation of voltage-gated Na+ channels and sustained opening of voltage-gated K+ channels",
      "Rapid influx of chloride ions through GABA receptors",
      "Active pumping of calcium ions out of the synaptic cleft",
      "Reversal of the ATP-driven sodium-potassium exchanger pump",
    ],
    correctIndex: 0,
    explanation:
      "At peak depolarization, voltage-gated Na+ channel inactivation gates close, arresting Na+ influx. Simultaneously, delayed rectifier K+ channels open, allowing rapid outward K+ efflux that drives membrane potential back toward resting levels.",
  },
  {
    id: "bio-06",
    subject: "Biomedical & Life Sciences",
    topic: "Pharmacology",
    stem: "In competitive enzyme inhibition, how do the maximum velocity (V_max) and the Michaelis constant (K_m) change in the presence of the inhibitor?",
    options: [
      "V_max remains unchanged while apparent K_m increases",
      "V_max decreases while K_m remains unchanged",
      "Both V_max and K_m decrease proportionally",
      "V_max increases while K_m approaches zero",
    ],
    correctIndex: 0,
    explanation:
      "Competitive inhibitors bind reversibly to the active site. High substrate concentrations outcompete the inhibitor, preserving V_max, but higher substrate is needed to reach half-maximal velocity, increasing apparent K_m.",
  },
  {
    id: "bio-07",
    subject: "Biomedical & Life Sciences",
    topic: "Evolutionary Biology",
    stem: "In population genetics, which of the following conditions is an essential assumption for a population to remain in Hardy-Weinberg equilibrium?",
    options: [
      "Absence of natural selection, mutation, migration, and presence of random mating in an infinitely large population",
      "Active positive assortative mating favoring heterozygous phenotypes",
      "High rates of directional gene flow from neighboring subspecies",
      "Strong selective pressure against recessive lethal alleles",
    ],
    correctIndex: 0,
    explanation:
      "Hardy-Weinberg equilibrium requires no mutations, no migration (gene flow), random mating, infinitely large population size (no genetic drift), and equal survival across genotypes (no selection).",
  },

  // -------------------------------------------------------------
  // 4. PHYSICS & SPACE SCIENCES (7 Questions)
  // -------------------------------------------------------------
  {
    id: "phys-01",
    subject: "Physics & Astronomy",
    topic: "Special Relativity",
    stem: "According to Einstein's Special Relativity, if a muon travels at 0.99c relative to an Earth-based laboratory, how does its observed lifetime compare to its rest frame lifetime (2.2 microseconds)?",
    options: [
      "Its lifetime in the laboratory frame appears significantly longer due to relativistic time dilation (Δt = γ Δt_0)",
      "Its lifetime appears shorter because mass increases and causes premature decay",
      "Its lifetime remains strictly 2.2 microseconds across all reference frames",
      "Its decay is arrested completely until velocity drops below 0.5c",
    ],
    correctIndex: 0,
    explanation:
      "Time dilation dictates that moving clocks run slow relative to stationary observers: Δt = γ Δt_0, where γ = 1/√(1 - v²/c²). For v = 0.99c, γ ≈ 7.1, extending laboratory lifetime to ~15.6 μs.",
  },
  {
    id: "phys-02",
    subject: "Physics & Astronomy",
    topic: "Quantum Mechanics",
    stem: "What does the Heisenberg Uncertainty Principle Δx · Δp ≥ ℏ / 2 state regarding simultaneous physical measurements?",
    options: [
      "The position and momentum of a quantum particle cannot both be precisely determined at the same instant",
      "Measurement errors stem entirely from technical imperfections in optical detectors",
      "Energy is only conserved when momentum uncertainty approaches infinity",
      "Particles lose momentum whenever an observer measures their spin orientation",
    ],
    correctIndex: 0,
    explanation:
      "The uncertainty principle is an intrinsic wave property of quantum systems arising from non-commuting operators [x̂, p̂] = iℏ, fundamentally limiting simultaneous precision regardless of experimental precision.",
  },
  {
    id: "phys-03",
    subject: "Physics & Astronomy",
    topic: "Thermodynamics",
    stem: "What does the Second Law of Thermodynamics state regarding the total entropy of an isolated thermodynamic system over time?",
    options: [
      "Total entropy never decreases; in any spontaneous process, ΔS_total ≥ 0",
      "Entropy approaches absolute zero as temperature increases",
      "Total entropy remains constant during irreversible phase transitions",
      "Heat can spontaneously transfer from a cooler body to a hotter body without external work",
    ],
    correctIndex: 0,
    explanation:
      "The Second Law states that spontaneous processes increase the total entropy of an isolated system (or universe). Reversible processes maintain constant entropy; irreversible processes strictly yield ΔS > 0.",
  },
  {
    id: "phys-04",
    subject: "Physics & Astronomy",
    topic: "Electromagnetism",
    stem: "In Maxwell's Equations, what physical phenomenon did James Clerk Maxwell introduce via the displacement current term (μ_0 ε_0 ∂E/∂t) in the Ampère-Maxwell law?",
    options: [
      "A time-varying electric field generates a circulating magnetic field even in the absence of conduction currents",
      "Magnetic monopoles generate divergent electric potential gradients",
      "Conduction charges dissipate energy into the vacuum at high frequencies",
      "Static electric fields exert torque on neutral dielectric slabs",
    ],
    correctIndex: 0,
    explanation:
      "Ampère's law failed for time-dependent circuits (like charging capacitors). Maxwell added the displacement current ∂D/∂t, predicting self-propagating electromagnetic waves traveling at speed c = 1/√(μ_0 ε_0).",
  },
  {
    id: "phys-05",
    subject: "Physics & Astronomy",
    topic: "Astrophysics & Cosmology",
    stem: "What is the Chandrasekhar limit in stellar astrophysics, and what is its approximate value?",
    options: [
      "The maximum stable mass of a non-rotating electron-degenerate white dwarf (~1.4 solar masses)",
      "The minimum mass required for a protostar to ignite deuterium fusion (~0.08 solar masses)",
      "The orbital radius beyond which tidal forces disrupt a celestial satellite",
      "The critical density of the universe required for flat spacetime geometry",
    ],
    correctIndex: 0,
    explanation:
      "Calculated by Subrahmanyan Chandrasekhar, ~1.4 M_☉ is the upper limit where electron degeneracy pressure can balance relativistic gravitational collapse, beyond which core collapse yields a neutron star or black hole.",
  },
  {
    id: "phys-06",
    subject: "Physics & Astronomy",
    topic: "Optics & Wave Mechanics",
    stem: "In Young's double-slit experiment, what determines the fringe spacing (distance between adjacent bright fringes) on a screen placed distance L away with slit separation d and light wavelength λ?",
    options: ["Δy = (λ L) / d", "Δy = (d L) / λ", "Δy = (λ d) / L", "Δy = λ / (L d)"],
    correctIndex: 0,
    explanation:
      "Path difference between slits is d sin θ ≈ d(y / L) for small angles. Constructive interference occurs at path difference = mλ, yielding fringe separation Δy = λL / d.",
  },
  {
    id: "phys-07",
    subject: "Physics & Astronomy",
    topic: "Classical Mechanics",
    stem: "According to Noether's Theorem, the conservation of angular momentum in an isolated physical system is a direct consequence of which continuous symmetry?",
    options: [
      "Rotational invariance of the Lagrangian in space",
      "Time-translation symmetry of the Hamiltonian",
      "Spatial translation invariance along the x-axis",
      "Gauge invariance of the electromagnetic 4-potential",
    ],
    correctIndex: 0,
    explanation:
      "Emmy Noether proved that every differentiable symmetry of the action yields a conservation law: time translation → energy conservation; spatial translation → linear momentum; rotational invariance → angular momentum.",
  },

  // -------------------------------------------------------------
  // 5. CHEMISTRY & MATERIALS SCIENCE (6 Questions)
  // -------------------------------------------------------------
  {
    id: "chem-01",
    subject: "Chemistry & Materials",
    topic: "Thermodynamics & Spontaneity",
    stem: "Under what thermodynamic conditions is a chemical reaction guaranteed to be spontaneous at all temperatures (ΔG < 0)?",
    options: [
      "Exothermic with positive entropy change (ΔH < 0 and ΔS > 0)",
      "Endothermic with negative entropy change (ΔH > 0 and ΔS < 0)",
      "Exothermic with negative entropy change (ΔH < 0 and ΔS < 0)",
      "Endothermic with zero entropy change (ΔH > 0 and ΔS = 0)",
    ],
    correctIndex: 0,
    explanation:
      "Gibbs free energy is ΔG = ΔH - TΔS. When ΔH is negative and ΔS is positive, both terms contribute negatively to ΔG at any positive absolute temperature T (Kelvin), ensuring ΔG is always negative.",
  },
  {
    id: "chem-02",
    subject: "Chemistry & Materials",
    topic: "Organic Reaction Mechanisms",
    stem: "In nucleophilic substitution reactions, what stereochemical outcome distinguishes an S_N2 mechanism from an S_N1 mechanism?",
    options: [
      "S_N2 proceeds with complete inversion of configuration (Walden inversion), whereas S_N1 yields racemization",
      "S_N2 yields a 50:50 racemic mixture while S_N1 strictly preserves initial retention",
      "S_N2 involves a planar carbocation intermediate attacked equally from both faces",
      "S_N2 only occurs at tertiary bridgehead carbons",
    ],
    correctIndex: 0,
    explanation:
      "S_N2 is a concerted bimolecular backside attack, inverting stereochemistry like an umbrella in a storm. S_N1 generates an achiral planar carbocation intermediate that nucleophiles attack from either side, leading to racemization.",
  },
  {
    id: "chem-03",
    subject: "Chemistry & Materials",
    topic: "Chemical Equilibrium",
    stem: "For the exothermic synthesis of ammonia (N_2(g) + 3H_2(g) ⇌ 2NH_3(g), ΔH = -92 kJ/mol), how does increasing the reaction temperature affect the equilibrium constant K_eq?",
    options: [
      "K_eq decreases, shifting equilibrium toward the reactants according to Le Chatelier's principle",
      "K_eq increases because molecular collisions occur with higher kinetic energy",
      "K_eq remains constant because equilibrium constants are invariant to temperature",
      "K_eq approaches infinity as ammonia gas completely dissociates",
    ],
    correctIndex: 0,
    explanation:
      "By van 't Hoff's equation (d ln K / dT = ΔH° / RT²), for an exothermic reaction (ΔH < 0), increasing temperature reduces K_eq, shifting equilibrium to favor the endothermic reverse direction.",
  },
  {
    id: "chem-04",
    subject: "Chemistry & Materials",
    topic: "Crystal & Materials Physics",
    stem: "Why do metallic solids exhibit high electrical and thermal conductivity compared to covalent network solids like diamond?",
    options: [
      "Valence electrons are delocalized into an electron sea occupying partially filled energy bands",
      "Metallic atomic nuclei vibrate faster than carbon atoms at ambient temperatures",
      "Metals lack valence electron orbitals and conduct charge via proton tunneling",
      "Ionic bonds in metals allow cations to flow freely across the crystal lattice",
    ],
    correctIndex: 0,
    explanation:
      "In metallic bonding, valence electrons are delocalized across the entire lattice (conduction band overlapping with the valence band). Free electrons carry charge and heat with high mean free paths under applied electric or thermal gradients.",
  },
  {
    id: "chem-05",
    subject: "Chemistry & Materials",
    topic: "Electrochemistry",
    stem: "According to the Nernst equation, what happens to the cell potential E_cell of a galvanic cell when the reaction quotient Q increases above standard conditions (Q > 1)?",
    options: [
      "E_cell decreases below standard cell potential E°_cell",
      "E_cell increases proportionally with the logarithm of Q",
      "The cell voltage remains strictly constant until reactants are fully depleted",
      "The polarity of the cathode and anode immediately reverses",
    ],
    correctIndex: 0,
    explanation:
      "The Nernst equation is E_cell = E°_cell - (RT / nF) ln Q. When Q increases (higher product concentration), the subtracted logarithmic term increases, decreasing the available cell potential E_cell toward equilibrium (E = 0).",
  },
  {
    id: "chem-06",
    subject: "Chemistry & Materials",
    topic: "Coordination Chemistry",
    stem: "In Crystal Field Theory, how do strong-field ligands (such as CN⁻ and CO) affect the d-orbital splitting energy (Δ_oct) in octahedral transition metal complexes?",
    options: [
      "They cause large d-orbital splitting Δ_oct, favoring low-spin electron configurations",
      "They eliminate crystal field splitting, restoring degenerate spherical d-orbitals",
      "They cause small splitting, forcing electrons to occupy higher e_g orbitals first (high-spin)",
      "They convert octahedral geometry into square planar geometry in all oxidation states",
    ],
    correctIndex: 0,
    explanation:
      "Strong-field ligands (high in the spectrochemical series) cause large crystal field splitting Δ_oct greater than pairing energy P. Electrons pair up in the lower t_2g orbitals first, producing low-spin complexes.",
  },

  // -------------------------------------------------------------
  // 6. ECONOMICS & GAME THEORY (5 Questions)
  // -------------------------------------------------------------
  {
    id: "econ-01",
    subject: "Economics & Finance",
    topic: "Game Theory",
    stem: "In a standard simultaneous-move Prisoner's Dilemma game, why is mutual defection the unique Nash Equilibrium despite mutual cooperation yielding higher Pareto-optimal payoffs?",
    options: [
      "Defection is a strictly dominant strategy for both players regardless of the other player's action",
      "Players are legally prohibited from communicating before choosing their strategies",
      "The game lacks common knowledge of player rationality",
      "Cooperation requires negative expected utility under zero-sum constraints",
    ],
    correctIndex: 0,
    explanation:
      "For each player, defecting yields a strictly better payoff whether the opponent cooperates (temptation > reward) or defects (punishment > sucker's payoff). Since defection strictly dominates, (Defect, Defect) is the unique Nash equilibrium.",
  },
  {
    id: "econ-02",
    subject: "Economics & Finance",
    topic: "Microeconomics",
    stem: "What does the First Fundamental Theorem of Welfare Economics formally state regarding competitive market equilibria?",
    options: [
      "Under complete markets, perfect competition, and absence of externalities, any competitive market equilibrium is Pareto efficient",
      "Free markets automatically eliminate all income inequality without government intervention",
      "Monopolies can achieve Pareto efficiency if price discrimination is outlawed",
      "Consumer surplus is maximized only when government sets price ceilings on essential commodities",
    ],
    correctIndex: 0,
    explanation:
      "The First Welfare Theorem proves mathematically that a competitive equilibrium where consumers maximize utility, producers maximize profit, and markets clear with no externalities or informational asymmetries is Pareto optimal.",
  },
  {
    id: "econ-03",
    subject: "Economics & Finance",
    topic: "Macroeconomics",
    stem: "What economic phenomenon does the Lucas Critique address regarding macroeconomic policy evaluation?",
    options: [
      "Predicting policy effects using historical aggregate relationships fails because rational agents change their expectations and behavior when policy rules change",
      "Central banks cannot control the money supply due to offshore banking deregulation",
      "Inflation is always and everywhere an unpreventable consequence of technological unemployment",
      "Government bond yields are decoupled from private corporate debt markets",
    ],
    correctIndex: 0,
    explanation:
      "Robert Lucas (1976) argued that statistical parameters estimated from historical data are not policy-invariant: when policymakers alter policy rules, optimizing forward-looking agents adapt their behavioral decision rules.",
  },
  {
    id: "econ-04",
    subject: "Economics & Finance",
    topic: "Financial Economics",
    stem: "According to the Efficient Market Hypothesis (EMH) in its Semi-Strong form, how do asset prices incorporate information?",
    options: [
      "Asset prices rapidly reflect all publicly available information, including financial statements, news, and macroeconomic data",
      "Asset prices reflect only past historical price movements and trading volumes",
      "Asset prices reflect all information, including insider and non-public private data",
      "Market prices deviate systematically from fundamental values due to behavioral biases",
    ],
    correctIndex: 0,
    explanation:
      "Weak form covers historical trading data; Semi-strong form covers all publicly available information (financial statements, news, earnings); Strong form covers all public and private insider information.",
  },
  {
    id: "econ-05",
    subject: "Economics & Finance",
    topic: "Public Economics & Externalities",
    stem: "According to the Coase Theorem, when will private parties be able to bargain and resolve negative externalities efficiently without government intervention?",
    options: [
      "When property rights are well-defined, enforceable, and transaction costs are negligible",
      "Only when the polluting party pays a mandatory Pigouvian excise tax",
      "When the market contains an infinite number of buyers and sellers",
      "When negative externalities are fully converted into public goods",
    ],
    correctIndex: 0,
    explanation:
      "Ronald Coase (1960) demonstrated that if property rights are clearly assigned and transaction costs are zero, parties will negotiate to the Pareto efficient allocation regardless of which party was initially assigned the right.",
  },

  // -------------------------------------------------------------
  // 7. PHILOSOPHY & FORMAL LOGIC (5 Questions)
  // -------------------------------------------------------------
  {
    id: "phil-01",
    subject: "Philosophy & Formal Logic",
    topic: "Mathematical Logic",
    stem: "What did Kurt Gödel's First Incompleteness Theorem establish regarding consistent, recursively axiomatizable formal mathematical systems capable of doing basic arithmetic?",
    options: [
      "There exist true mathematical statements that cannot be proven within the formal system itself",
      "All consistent mathematical theories can be proven complete using first-order predicate calculus",
      "Mathematical truth is equivalent to algorithmic deciders running in polynomial time",
      "Arithmetic contradictions can be eliminated by expanding Zermelo-Fraenkel set axioms",
    ],
    correctIndex: 0,
    explanation:
      "Gödel proved in 1931 that any consistent formal system F capable of expressing Peano arithmetic is necessarily incomplete: there exist true propositions G_F such that neither G_F nor ¬G_F can be proven within F.",
  },
  {
    id: "phil-02",
    subject: "Philosophy & Formal Logic",
    topic: "Propositional Logic",
    stem: "In classical propositional logic, which of the following expressions is logically equivalent to the conditional statement P → Q?",
    options: ["¬P ∨ Q", "¬P ∧ Q", "P ∧ ¬Q", "¬Q → ¬P is the only valid negation"],
    correctIndex: 0,
    explanation:
      "By definition of material implication, P → Q is false only when P is true and Q is false. Hence, P → Q ≡ ¬P ∨ Q (and by contraposition, ≡ ¬Q → ¬P).",
  },
  {
    id: "phil-03",
    subject: "Philosophy & Formal Logic",
    topic: "Philosophy of Science",
    stem: "In Karl Popper's philosophy of scientific discovery, what criterion distinguishes scientific theories from metaphysical or pseudoscientific claims?",
    options: [
      "Falsifiability: empirical claims must be capable of being refuted by possible observations",
      "Inductive verification: theories must be confirmed by an overwhelming number of empirical instances",
      "Consensus agreement: theories are validated when accepted by accredited scientific institutions",
      "Logical positivism: statements must reduce directly to sensory protocol sentences",
    ],
    correctIndex: 0,
    explanation:
      "Popper argued that no amount of confirming instances can prove a universal generalization, but a single counterexample can refute it. A demarcation criterion for empirical science is therefore empirical falsifiability.",
  },
  {
    id: "phil-04",
    subject: "Philosophy & Formal Logic",
    topic: "Ethics & Decision Theory",
    stem: "What core moral principle defines Immanuel Kant's Deontological ethics (Categorical Imperative, Formula of Universal Law)?",
    options: [
      "Act only according to that maxim whereby you can at the same time will that it should become a universal law",
      "Maximize the aggregate happiness and minimize the net suffering of the greatest number of sentient beings",
      "Cultivate the golden mean between extreme character deficiencies and excesses",
      "Actions are morally neutral until validated by subjective emotional approval",
    ],
    correctIndex: 0,
    explanation:
      "Kant's first formulation of the Categorical Imperative: 'Act only according to that maxim whereby you can at the same time will that it should become a universal law.' Moral duty is categorical, unconditional, and grounded in pure practical reason.",
  },
  {
    id: "phil-05",
    subject: "Philosophy & Formal Logic",
    topic: "Epistemology",
    stem: "What epistemic dilemma did Edmund Gettier raise in 1963 against the classical definition of knowledge as 'Justified True Belief' (JTB)?",
    options: [
      "He constructed cases where an agent holds a justified true belief, yet intuitively lacks knowledge due to epistemic luck",
      "He proved that human sensory perception can never justify external physical reality",
      "He showed that beliefs cannot be true unless proven through mathematical formalisms",
      "He demonstrated that justification requires infinite regressive chains of foundational axioms",
    ],
    correctIndex: 0,
    explanation:
      "Gettier counterexamples demonstrate agents having a belief that is both true and justified, but where the justification is connected to the truth only accidentally or via false lemmas, showing JTB is insufficient for knowledge.",
  },

  // -------------------------------------------------------------
  // 8. EARTH & ENVIRONMENTAL SYSTEMS (5 Questions)
  // -------------------------------------------------------------
  {
    id: "env-01",
    subject: "Earth & Environmental Sciences",
    topic: "Climate Dynamics",
    stem: "In Earth's radiative heat balance, why are greenhouse gases like CO2 and H2O capable of trapping heat while atmospheric N2 and O2 are largely transparent to it?",
    options: [
      "Greenhouse gas molecules have dipole moments or vibrational modes that absorb infrared radiation, unlike homonuclear diatomics",
      "CO2 molecules are heavier and settle near the surface, acting as a physical blanket",
      "N2 and O2 reflect 100% of incoming solar ultraviolet radiation back into space",
      "Greenhouse gases absorb visible sunlight and reradiate it directly as microwave energy",
    ],
    correctIndex: 0,
    explanation:
      "Homonuclear diatomics (N2, O2) have no permanent or induced electric dipole during vibration, making them infrared-inactive. Heteronuclear and triatomic molecules (CO2, H2O, CH4) vibrate with changing dipole moments, absorbing outgoing terrestrial infrared.",
  },
  {
    id: "env-02",
    subject: "Earth & Environmental Sciences",
    topic: "Plate Tectonics",
    stem: "What geological mechanism generates deep oceanic trenches and volcanic island arcs at convergent plate boundaries?",
    options: [
      "Subduction: an oceanic lithospheric plate descends into the asthenosphere beneath an overriding plate",
      "Seafloor spreading along divergent mid-ocean ridges",
      "Transform strike-slip faulting shearing past continental margins",
      "Isostatic rebound following continental glacial retreat",
    ],
    correctIndex: 0,
    explanation:
      "At convergent oceanic-oceanic or oceanic-continental margins, the denser oceanic plate flexes and plunges into the mantle (subduction zone), carving deep oceanic trenches and melting mantle wedges to produce volcanic island arcs.",
  },
  {
    id: "env-03",
    subject: "Earth & Environmental Sciences",
    topic: "Oceanography & Thermohaline Circulation",
    stem: "What physical drivers power the global ocean conveyor belt (Atlantic Meridional Overturning Circulation, AMOC)?",
    options: [
      "Density differences driven by water temperature (thermal) and salinity (haline) gradients",
      "Coriolis forces acting exclusively on surface equatorial trade winds",
      "Lunar gravitational tidal friction dissipating along shallow continental shelves",
      "Geothermal heat vents warming the abyssal sea floor at the Mariana Trench",
    ],
    correctIndex: 0,
    explanation:
      "Thermohaline circulation is driven by dense, cold, high-salinity water sinking in North Atlantic subpolar regions (deep water formation) and slowly upwelling in the Southern and Pacific oceans, circulating heat globally.",
  },
  {
    id: "env-04",
    subject: "Earth & Environmental Sciences",
    topic: "Biogeochemical Cycles",
    stem: "In the marine biological carbon pump, what is the primary process transferring atmospheric carbon into the deep ocean sediments?",
    options: [
      "Phytoplankton photosynthesis in the euphotic zone followed by gravitational settling of organic particulate carbon",
      "Direct precipitation of calcium carbonate from atmospheric nitrogen gas",
      "Passive diffusion of methane clathrates from the abyssal plain to coastal lagoons",
      "Hydrothermal vents absorbing carbon monoxide into basaltic crust",
    ],
    correctIndex: 0,
    explanation:
      "Phytoplankton fix dissolved CO2 into organic carbon via photosynthesis. When organisms die or produce fecal pellets, a fraction of this particulate organic carbon sinks into the mesopelagic and bathypelagic zones, sequestering carbon for centuries.",
  },
  {
    id: "env-05",
    subject: "Earth & Environmental Sciences",
    topic: "Ecology & Trophic Dynamics",
    stem: "According to Lindeman's efficiency rule in trophic ecology, approximately what percentage of energy is transferred from one trophic level to the next?",
    options: ["Approximately 10%", "Exactly 50%", "Over 80%", "Less than 0.1%"],
    correctIndex: 0,
    explanation:
      "Raymond Lindeman (1942) established that on average only ~10% of chemical energy from one trophic level is incorporated into the next higher level; ~90% is dissipated as metabolic respiration heat, excretion, or unconsumed biomass.",
  },
];

/**
 * Deterministically or randomly samples N questions from the 50-question curated pool.
 */
export function getSampledPlaygroundQuestions(count = 10, shuffle = true): CuratedPlaygroundQuestion[] {
  if (!shuffle) {
    return PLAYGROUND_CURATED_QUESTIONS.slice(0, count);
  }
  const copy = [...PLAYGROUND_CURATED_QUESTIONS];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
