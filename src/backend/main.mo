import Array "mo:core/Array";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";

actor {
  type ScoreEntry = {
    playerName : Text;
    score : Nat;
    timeInSeconds : Nat;
  };

  module ScoreEntry {
    public func compareByScoreDescending(entry1 : ScoreEntry, entry2 : ScoreEntry) : Order.Order {
      Nat.compare(entry2.score, entry1.score);
    };
  };

  var nextId = 0;
  let scores = Map.empty<Nat, ScoreEntry>();

  public shared ({ caller }) func submitScore(playerName : Text, score : Nat, timeInSeconds : Nat) : async () {
    if (playerName.isEmpty()) {
      Runtime.trap("Player name cannot be empty");
    };
    let newEntry : ScoreEntry = {
      playerName;
      score;
      timeInSeconds;
    };
    scores.add(nextId, newEntry);
    nextId += 1;
  };

  public query ({ caller }) func getTopScores() : async [ScoreEntry] {
    let allScores = scores.values().toArray();
    let sortedScores = allScores.sort(ScoreEntry.compareByScoreDescending);
    let length = sortedScores.size();
    if (length <= 10) {
      return sortedScores;
    };

    Array.tabulate(
      10,
      func(i) {
        sortedScores[i];
      },
    );
  };
};
